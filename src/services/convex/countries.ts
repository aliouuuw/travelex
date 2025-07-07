import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Types matching the original Supabase service
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

export interface CountryRequest {
  id: string;
  countryName: string;
  countryCode?: string;
  requestedBy: string;
  requesterName: string;
  requesterEmail: string;
  businessJustification?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MyCountryRequest {
  id: string;
  countryName: string;
  countryCode: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
}

// React hooks for countries
export const useAvailableCountries = () => {
  return useQuery(api.countries.getAvailableCountries);
};

export const useAvailableCitiesByCountry = () => {
  return useQuery(api.countries.getAvailableCitiesByCountry);
};

export const useCitiesForCountry = (countryCode: string) => {
  return useQuery(api.countries.getCitiesForCountry, { countryCode });
};

export const useCountryRequests = (status?: 'pending' | 'approved' | 'rejected') => {
  return useQuery(api.countries.getCountryRequests, { status });
};

export const useMyCountryRequests = () => {
  return useQuery(api.countries.getMyCountryRequests);
};

// Mutation hooks
export const useCreateCountry = () => {
  return useMutation(api.countries.createCountry);
};

export const useUpdateCountry = () => {
  return useMutation(api.countries.updateCountry);
};

export const useDeleteCountry = () => {
  return useMutation(api.countries.deleteCountry);
};

export const useSubmitCountryRequest = () => {
  return useMutation(api.countries.submitCountryRequest);
};

export const useApproveCountryRequest = () => {
  return useMutation(api.countries.approveCountryRequest);
};

export const useRejectCountryRequest = () => {
  return useMutation(api.countries.rejectCountryRequest);
};

export const useCreateGlobalCity = () => {
  return useMutation(api.countries.createGlobalCity);
};

// Promise-based functions for backward compatibility
export const getAvailableCountries = async (): Promise<Country[]> => {
  // This is a placeholder - in practice, you'd use the ConvexClient directly
  // For now, components should use the hooks above
  throw new Error("Use useAvailableCountries hook instead");
};

export const getAvailableCitiesByCountry = async (): Promise<CityWithCountry[]> => {
  throw new Error("Use useAvailableCitiesByCountry hook instead");
};

// export const getCitiesForCountry = async (countryCode: string): Promise<CityWithCountry[]> => {
//   throw new Error("Use useCitiesForCountry hook instead");
// };

// export const verifyCityCountry = async (cityName: string, countryCode: string): Promise<boolean> => {
//   throw new Error("Use direct Convex query instead");
// };

// export const submitCountryRequest = async (request: {
//   countryName: string;
//   countryCode: string;
//   reason: string;
// }): Promise<string> => {
//   throw new Error("Use useSubmitCountryRequest hook instead");
// };

// export const getCountryRequests = async (status?: 'pending' | 'approved' | 'rejected'): Promise<CountryRequest[]> => {
//   throw new Error("Use useCountryRequests hook instead");
// };

export const getMyCountryRequests = async (): Promise<MyCountryRequest[]> => {
  throw new Error("Use useMyCountryRequests hook instead");
};

// export const approveCountryRequest = async (requestId: string, flagEmoji?: string): Promise<boolean> => {
//   throw new Error("Use useApproveCountryRequest hook instead");
// };

// export const rejectCountryRequest = async (requestId: string, adminNotes?: string): Promise<boolean> => {
//   throw new Error("Use useRejectCountryRequest hook instead");
// };

// export const createCountry = async (country: {
//   name: string;
//   code: string;
//   flagEmoji?: string;
// }): Promise<Country> => {
//   throw new Error("Use useCreateCountry hook instead");
// };

// export const createCity = async (cityName: string, countryCode: string): Promise<boolean> => {
//   throw new Error("Use cities service instead");
// }; 