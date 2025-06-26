import { supabase } from './supabase';

// Types for reusable cities and stations
export interface ReusableStation {
  id?: string;
  name: string;
  address: string;
}

export interface ReusableCity {
  id?: string;
  cityName: string;
  stations: ReusableStation[];
}

// Get all reusable cities and stations for the current driver
export const getDriverCitiesAndStations = async (): Promise<ReusableCity[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase.rpc('get_driver_cities_and_stations', {
    driver_uuid: user.id
  });

  if (error) {
    console.error('Error fetching driver cities and stations:', error);
    throw new Error(error.message);
  }

  return data || [];
};

// Save cities and stations (creates new or updates existing)
export const saveCitiesAndStations = async (cities: ReusableCity[]): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase.rpc('save_cities_and_stations', {
    p_driver_id: user.id,
    p_cities: cities
  });

  if (error) {
    console.error('Error saving cities and stations:', error);
    throw new Error(error.message);
  }

  return data;
};

// Get stations for a specific city
export const getStationsForCity = async (cityName: string): Promise<ReusableStation[]> => {
  const cities = await getDriverCitiesAndStations();
  const city = cities.find(c => c.cityName === cityName);
  return city?.stations || [];
};

// Add a new city with stations
export const addCityWithStations = async (city: ReusableCity): Promise<boolean> => {
  const existingCities = await getDriverCitiesAndStations();
  const updatedCities = [...existingCities, city];
  return saveCitiesAndStations(updatedCities);
};

// Update an existing city and its stations
export const updateCityWithStations = async (cityName: string, updatedCity: ReusableCity): Promise<boolean> => {
  const existingCities = await getDriverCitiesAndStations();
  const updatedCities = existingCities.map(city => 
    city.cityName === cityName ? updatedCity : city
  );
  return saveCitiesAndStations(updatedCities);
};

// Delete a city and all its stations
export const deleteCity = async (cityName: string): Promise<boolean> => {
  const existingCities = await getDriverCitiesAndStations();
  const updatedCities = existingCities.filter(city => city.cityName !== cityName);
  return saveCitiesAndStations(updatedCities);
};

// Add a station to an existing city
export const addStationToCity = async (cityName: string, station: ReusableStation): Promise<boolean> => {
  const existingCities = await getDriverCitiesAndStations();
  const updatedCities = existingCities.map(city => {
    if (city.cityName === cityName) {
      return {
        ...city,
        stations: [...city.stations, station]
      };
    }
    return city;
  });
  return saveCitiesAndStations(updatedCities);
};

// Remove a station from a city
export const removeStationFromCity = async (cityName: string, stationName: string): Promise<boolean> => {
  const existingCities = await getDriverCitiesAndStations();
  const updatedCities = existingCities.map(city => {
    if (city.cityName === cityName) {
      return {
        ...city,
        stations: city.stations.filter(station => station.name !== stationName)
      };
    }
    return city;
  });
  return saveCitiesAndStations(updatedCities);
};

// Extract and save cities/stations from route template data
export const extractAndSaveCitiesFromRoute = async (cities: Array<{ cityName: string; stations: ReusableStation[] }>): Promise<void> => {
  const existingCities = await getDriverCitiesAndStations();
  
  // Merge new cities with existing ones
  const mergedCities = [...existingCities];
  
  cities.forEach(newCity => {
    const existingCityIndex = mergedCities.findIndex(c => c.cityName === newCity.cityName);
    
    if (existingCityIndex >= 0) {
      // City exists, merge stations
      const existingCity = mergedCities[existingCityIndex];
      const mergedStations = [...existingCity.stations];
      
      newCity.stations.forEach(newStation => {
        const stationExists = mergedStations.some(s => s.name === newStation.name);
        if (!stationExists) {
          mergedStations.push(newStation);
        }
      });
      
      mergedCities[existingCityIndex] = {
        ...existingCity,
        stations: mergedStations
      };
    } else {
      // New city, add it
      mergedCities.push({
        cityName: newCity.cityName,
        stations: newCity.stations
      });
    }
  });
  
  await saveCitiesAndStations(mergedCities);
}; 