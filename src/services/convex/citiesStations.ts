import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { convex } from "@/lib/convex";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
  return useQuery(
    api.citiesStations.getDriverCitiesAndStations,
    user?.profile?.role === "driver" || user?.profile?.role === "admin"
      ? {}
      : "skip",
  );
};

export const useStationsForCity = (cityName: string) => {
  console.log("useStationsForCity hook - received cityName:", cityName);
  return useQuery(api.citiesStations.getStationsForCity, { cityName });
};

// Public hook for getting stations (no authentication required)
export const usePublicStationsForCity = (cityName: string) => {
  return useQuery(
    api.citiesStations.getPublicStationsForCity,
    cityName ? { cityName } : "skip",
  );
};

// Hook for getting driver's own stations from route templates
export const useDriverStationsForCity = (cityName: string) => {
  const { user } = useAuth();
  return useQuery(
    api.citiesStations.getDriverStationsForCity,
    user?.profile?.role === "driver" || user?.profile?.role === "admin"
      ? { cityName }
      : "skip",
  );
};

// Combined hook that fetches stations from both reusable cities and route templates
export const useCombinedStationsForCity = (
  cityName: string,
): ReusableStation[] => {
  const { user } = useAuth();

  // Get stations from reusable cities (if authenticated)
  const reusableStations = useQuery(
    api.citiesStations.getStationsForCity,
    user?.profile?.role === "driver" || user?.profile?.role === "admin"
      ? { cityName }
      : "skip",
  );

  // Get stations from route templates (driver-specific)
  const driverTemplateStations = useDriverStationsForCity(cityName);

  // Combine and deduplicate stations
  const stations = new Map();

  // Add reusable stations first (higher priority)
  if (reusableStations) {
    reusableStations.forEach((station: ReusableStation) => {
      const key = `${station.name}-${station.address}`.toLowerCase();
      stations.set(key, station);
    });
  }

  // Add driver's template stations (only if not already present)
  if (driverTemplateStations) {
    driverTemplateStations.forEach((station: ReusableStation) => {
      const key = `${station.name}-${station.address}`.toLowerCase();
      if (!stations.has(key)) {
        stations.set(key, station);
      }
    });
  }

  return Array.from(stations.values());
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
  const result = await convex.query(
    api.citiesStations.getDriverCitiesAndStations,
  );
  return result || [];
};

export const getStationsForCity = async (
  cityName: string,
): Promise<ReusableStation[]> => {
  const result = await convex.query(api.citiesStations.getStationsForCity, {
    cityName,
  });
  return result || [];
};

// Public function to get stations without authentication
export const getPublicStationsForCity = async (
  cityName: string,
): Promise<ReusableStation[]> => {
  const result = await convex.query(
    api.citiesStations.getPublicStationsForCity,
    { cityName },
  );
  return result || [];
};

// Function to get driver's own stations from route templates
export const getDriverStationsForCity = async (
  cityName: string,
): Promise<ReusableStation[]> => {
  const result = await convex.query(
    api.citiesStations.getDriverStationsForCity,
    { cityName },
  );
  return result || [];
};
