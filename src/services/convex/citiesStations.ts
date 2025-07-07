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

// Public hook for getting stations (no authentication required)
export const usePublicStationsForCity = (cityName: string) => {
  return useQuery(
    api.citiesStations.getPublicStationsForCity, 
    cityName ? { cityName } : "skip"
  );
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

export const getStationsForCity = async (cityName: string): Promise<ReusableStation[]> => {
  const result = await convex.query(api.citiesStations.getStationsForCity, { cityName });
  return result || [];
};

// Public function to get stations without authentication
export const getPublicStationsForCity = async (cityName: string): Promise<ReusableStation[]> => {
  const result = await convex.query(api.citiesStations.getPublicStationsForCity, { cityName });
  return result || [];
}; 