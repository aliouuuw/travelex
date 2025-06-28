import { supabase } from './supabase';

export interface Country {
  code: string;
  name: string;
  flagEmoji?: string;
  cityCount: number;
  tripCount: number;
}

export interface CityWithCountry {
  countryCode: string;
  countryName: string;
  flagEmoji?: string;
  cityName: string;
  tripCount: number;
}

/**
 * Get available countries (Senegal and Canada)
 */
export const getAvailableCountries = async (): Promise<Country[]> => {
  const { data, error } = await supabase.rpc('get_available_countries');

  if (error) {
    console.error('Error fetching countries:', error);
    throw new Error(error.message);
  }

  return data?.map((country: any) => ({
    code: country.country_code,
    name: country.country_name,
    flagEmoji: country.flag_emoji,
    cityCount: country.city_count,
    tripCount: country.trip_count,
  })) || [];
};

/**
 * Get all cities grouped by country
 */
export const getAvailableCitiesByCountry = async (): Promise<CityWithCountry[]> => {
  const { data, error } = await supabase.rpc('get_available_cities_by_country');

  if (error) {
    console.error('Error fetching cities by country:', error);
    throw new Error(error.message);
  }

  return data?.map((city: any) => ({
    countryCode: city.country_code,
    countryName: city.country_name,
    flagEmoji: city.flag_emoji,
    cityName: city.city_name,
    tripCount: city.trip_count,
  })) || [];
};

/**
 * Get cities for a specific country
 */
export const getCitiesForCountry = async (countryCode: string): Promise<CityWithCountry[]> => {
  const allCities = await getAvailableCitiesByCountry();
  return allCities.filter(city => city.countryCode === countryCode);
};

/**
 * Check if a city belongs to a specific country
 */
export const verifyCityCountry = async (cityName: string, countryCode: string): Promise<boolean> => {
  const cities = await getCitiesForCountry(countryCode);
  return cities.some(city => city.cityName.toLowerCase() === cityName.toLowerCase());
}; 