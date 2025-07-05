import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { convex } from "@/lib/convex";

// Types matching the original Supabase service
export interface ReusableStation {
  id?: string;
  name: string;
  address: string;
}

export interface ReusableCity {
  id?: string;
  cityName: string;
  countryCode?: string;
  stations: ReusableStation[];
}

// React hooks for cities and stations
export const useDriverCitiesAndStations = () => {
  return useQuery(api.citiesStations.getDriverCitiesAndStations);
};

export const useStationsForCity = (cityName: string) => {
  return useQuery(api.citiesStations.getStationsForCity, { cityName });
};

// Mutation hooks
export const useSaveCitiesAndStations = () => {
  return useMutation(api.citiesStations.saveCitiesAndStations);
};

export const useAddCityWithStations = () => {
  return useMutation(api.citiesStations.addCityWithStations);
};

export const useExtractAndSaveCitiesFromRoute = () => {
  return useMutation(api.citiesStations.extractAndSaveCitiesFromRoute);
};

// Promise-based functions for backward compatibility
export const getDriverCitiesAndStations = async (): Promise<ReusableCity[]> => {
  const result = await convex.query(api.citiesStations.getDriverCitiesAndStations);
  return result || [];
};

// export const saveCitiesAndStations = async (cities: ReusableCity[]): Promise<boolean> => {
//   throw new Error("Use useSaveCitiesAndStations hook instead");
// };

// export const getStationsForCity = async (cityName: string): Promise<ReusableStation[]> => {
//   throw new Error("Use useStationsForCity hook instead");
// };

// export const addCityWithStations = async (city: ReusableCity): Promise<boolean> => {
//   throw new Error("Use useAddCityWithStations hook instead");
// };

// export const updateCityWithStations = async (cityName: string, updatedCity: ReusableCity): Promise<boolean> => {
//   throw new Error("Use saveCitiesAndStations hook instead");
// };

// export const deleteCity = async (cityName: string): Promise<boolean> => {
//   throw new Error("Use saveCitiesAndStations hook instead");
// };

// export const addStationToCity = async (cityName: string, station: ReusableStation): Promise<boolean> => {
//   throw new Error("Use saveCitiesAndStations hook instead");
// };

// export const removeStationFromCity = async (cityName: string, stationName: string): Promise<boolean> => {
//   throw new Error("Use saveCitiesAndStations hook instead");
// };

// export const extractAndSaveCitiesFromRoute = async (cities: Array<{ cityName: string; stations: ReusableStation[] }>): Promise<void> => {
//   throw new Error("Use useExtractAndSaveCitiesFromRoute hook instead");
// }; 