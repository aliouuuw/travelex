import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

// Types matching the original Supabase service
export type RouteTemplateStatus = 'draft' | 'active' | 'inactive';

export interface Station {
  id?: Id<"routeTemplateStations">;
  name: string;
  address: string;
}

export interface CityWithStations {
  cityName: string;
  countryCode?: string;
  countryName?: string;
  flagEmoji?: string;
  sequenceOrder?: number;
  stations: Station[];
}

export interface InterCityFare {
  fromCity: string;
  toCity: string;
  fare: number;
}

export interface RouteTemplateFormData {
  name: string;
  estimatedDuration: string;
  basePrice: number;
  status: RouteTemplateStatus;
  cities: CityWithStations[];
  intercityFares: InterCityFare[];
}

export interface RouteTemplate extends RouteTemplateFormData {
  id: string;
  driverId: string;
  createdAt: number;
  updatedAt: number;
  scheduledTrips: number;
  completedTrips: number;
  totalEarnings: number;
}

export interface RouteCountryValidation {
  cityName: string;
  countryCode: string;
  countryName: string;
  isValid: boolean;
  validationMessage: string;
}

// React hooks for route templates
export const useDriverRouteTemplates = () => {
  return useQuery(api.routeTemplates.getDriverRouteTemplates);
};

export const useRouteTemplateById = (routeTemplateId?: Id<"routeTemplates">) => {
  return useQuery(api.routeTemplates.getRouteTemplateById, routeTemplateId ? { routeTemplateId } : "skip");
};

export const useValidateRouteCountries = (routeTemplateId: Id<"routeTemplates">) => {
  return useQuery(api.routeTemplates.validateRouteCountries, { routeTemplateId });
};

// Mutation hooks
export const useCreateRouteTemplate = () => {
  return useMutation(api.routeTemplates.createRouteTemplate);
};

export const useUpdateRouteTemplate = () => {
  return useMutation(api.routeTemplates.updateRouteTemplate);
};

export const useDeleteRouteTemplate = () => {
  return useMutation(api.routeTemplates.deleteRouteTemplate);
};

export const useToggleRouteTemplateStatus = () => {
  return useMutation(api.routeTemplates.toggleRouteTemplateStatus);
};

// Promise-based functions for backward compatibility
export const getDriverRouteTemplates = async (): Promise<RouteTemplate[]> => {
  throw new Error("Use useDriverRouteTemplates hook instead");
};

// export const getRouteTemplateById = async (id: string): Promise<RouteTemplate | null> => {
//   throw new Error("Use useRouteTemplateById hook instead");
// };

// export const createRouteTemplate = async (routeData: RouteTemplateFormData): Promise<string> => {
//   throw new Error("Use useCreateRouteTemplate hook instead");
// };

// export const updateRouteTemplate = async (id: string, routeData: RouteTemplateFormData): Promise<boolean> => {
//   throw new Error("Use useUpdateRouteTemplate hook instead");
// };

// export const deleteRouteTemplate = async (id: string): Promise<boolean> => {
//   throw new Error("Use useDeleteRouteTemplate hook instead");
// };

// export const toggleRouteTemplateStatus = async (id: string, newStatus: RouteTemplateStatus): Promise<boolean> => {
//   throw new Error("Use useToggleRouteTemplateStatus hook instead");
// };

// export const createRouteTemplateWithCountries = async (routeData: RouteTemplateFormData): Promise<string> => {
//   throw new Error("Use useCreateRouteTemplate hook instead");
// };

// export const validateRouteCountries = async (routeId: string): Promise<RouteCountryValidation[]> => {
//   throw new Error("Use useValidateRouteCountries hook instead");
// };

// export const autoAssignCountriesToRoutes = async (): Promise<number> => {
//   throw new Error("Not implemented in Convex version");
// }; 