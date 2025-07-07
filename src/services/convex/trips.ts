import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { convex } from "@/lib/convex";
import type { Id } from "convex/_generated/dataModel";

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface TripStation {
  id: string;
  stationId: string;
  stationName: string;
  stationAddress: string;
  cityName: string;
  sequenceOrder: number;
  isPickupPoint: boolean;
  isDropoffPoint: boolean;
}

export interface RouteCity {
  id?: string;
  cityName: string;
  sequenceOrder: number;
  stations?: Array<{
    id: string;
    name: string;
    address: string;
  }>;
}

export interface Trip {
  id: string;
  routeTemplateId: string;
  routeTemplateName: string;
  vehicleId: string | null;
  vehicleName: string | null;
  luggagePolicyId: string | null;
  luggagePolicyName: string | null;
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  availableSeats: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  routeCities: RouteCity[];
  tripStations: TripStation[];
  reservationsCount?: number;
  totalEarnings?: number;
}

export interface TripFormData {
  routeTemplateId: string;
  vehicleId: string;
  luggagePolicyId: string | null;
  departureTime: string;
  arrivalTime: string;
  selectedStations: Array<{
    routeTemplateCityId: string;
    routeTemplateStationId: string;
    cityName: string;
    sequenceOrder: number;
    isPickupPoint: boolean;
    isDropoffPoint: boolean;
  }>;
}

// =============================================
// REACT HOOKS
// =============================================

/**
 * Hook to get all trips for the current driver
 */
export const useDriverTrips = () => {
  return useQuery(api.trips.getDriverTrips, {});
};

/**
 * Hook to get a single trip by ID
 */
export const useTripById = (tripId: string) => {
  return useQuery(
    api.trips.getTripById,
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );
};

/**
 * Hook to create a new trip
 */
export const useCreateTrip = () => {
  return useMutation(api.trips.createTrip);
};

/**
 * Hook to create multiple trips in batch
 */
export const useCreateBatchTrips = () => {
  return useMutation(api.trips.createBatchTrips);
};

/**
 * Hook to update a trip
 */
export const useUpdateTrip = () => {
  return useMutation(api.trips.updateTrip);
};

/**
 * Hook to delete a trip
 */
export const useDeleteTrip = () => {
  return useMutation(api.trips.deleteTrip);
};

/**
 * Hook to update trip status
 */
export const useUpdateTripStatus = () => {
  return useMutation(api.trips.updateTripStatus);
};

// =============================================
// PROMISE-BASED FUNCTIONS (for backward compatibility)
// =============================================

/**
 * Get all trips for the current driver
 */
export const getDriverTrips = async (): Promise<Trip[]> => {
  const result = await convex.query(api.trips.getDriverTrips, {});
  
  return result.map(transformTripFromConvex);
};

/**
 * Get a single trip by ID
 */
export const getTripById = async (id: string): Promise<Trip | null> => {
  try {
    const result = await convex.query(api.trips.getTripById, {
      tripId: id as Id<"trips">,
    });
    
    return result ? transformTripFromConvex(result) : null;
  } catch (error) {
    console.error("Error fetching trip:", error);
    return null;
  }
};

/**
 * Create a new trip
 */
export const createTrip = async (tripData: TripFormData): Promise<string> => {
  // Transform the data to match convex expectations
  const convexData = await transformTripDataToConvex(tripData);
  
  const result = await convex.mutation(api.trips.createTrip, convexData);
  return result;
};

/**
 * Create multiple trips in batch
 */
export const createBatchTrips = async (tripsData: TripFormData[]): Promise<string[]> => {
  // Transform the data to match convex expectations
  const convexData = await Promise.all(tripsData.map(tripData => transformTripDataToConvex(tripData)));
  
  const result = await convex.mutation(api.trips.createBatchTrips, { trips: convexData });
  return result;
};

/**
 * Update an existing trip
 */
export const updateTrip = async (tripId: string, tripData: Omit<TripFormData, 'routeTemplateId'>): Promise<void> => {
  // Transform the data to match convex expectations
  const convexData = await transformUpdateTripDataToConvex(tripData);
  
  await convex.mutation(api.trips.updateTrip, {
    tripId: tripId as Id<"trips">,
    ...convexData,
  });
};

/**
 * Delete a trip
 */
export const deleteTrip = async (tripId: string): Promise<void> => {
  await convex.mutation(api.trips.deleteTrip, {
    tripId: tripId as Id<"trips">,
  });
};

/**
 * Update trip status
 */
export const updateTripStatus = async (tripId: string, status: Trip['status']): Promise<void> => {
  await convex.mutation(api.trips.updateTripStatus, {
    tripId: tripId as Id<"trips">,
    status,
  });
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Transform trip data from convex format to our interface
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTripFromConvex(convexTrip: Record<string, any>): Trip {
  return {
    id: convexTrip.tripId || convexTrip.id,
    routeTemplateId: convexTrip.routeTemplateId,
    routeTemplateName: convexTrip.routeTemplateName,
    vehicleId: convexTrip.vehicleInfo?.id || convexTrip.vehicleId,
    vehicleName: convexTrip.vehicleName || 
      (convexTrip.vehicleInfo ? `${convexTrip.vehicleInfo.make} ${convexTrip.vehicleInfo.model}` : null),
    luggagePolicyId: convexTrip.luggagePolicyId,
    luggagePolicyName: convexTrip.luggagePolicyName,
    departureTime: convexTrip.departureTime,
    arrivalTime: convexTrip.arrivalTime || convexTrip.departureTime,
    totalSeats: convexTrip.totalSeats,
    availableSeats: convexTrip.availableSeats,
    status: convexTrip.status,
    createdAt: convexTrip.createdAt || new Date().toISOString(),
    updatedAt: convexTrip.updatedAt || new Date().toISOString(),
    routeCities: Array.isArray(convexTrip.routeCities) 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? convexTrip.routeCities.map((city: any) => 
          typeof city === 'string' 
            ? { cityName: city, sequenceOrder: 0 }
            : city
        )
      : [],
    tripStations: convexTrip.tripStations || [],
    reservationsCount: convexTrip.reservationsCount || 0,
    totalEarnings: convexTrip.totalEarnings || 0,
  };
}

/**
 * Transform trip form data to convex format
 */
async function transformTripDataToConvex(tripData: TripFormData) {
  // Convert date strings to timestamps
  const departureTime = new Date(tripData.departureTime).getTime();
  const arrivalTime = new Date(tripData.arrivalTime).getTime();
  
  // Transform selected stations to convex format
  const stationSelections = tripData.selectedStations.map(station => ({
    routeTemplateCityId: station.routeTemplateCityId as Id<"routeTemplateCities">,
    stationId: station.routeTemplateStationId as Id<"routeTemplateStations">,
    isPickupPoint: station.isPickupPoint,
    isDropoffPoint: station.isDropoffPoint,
    estimatedTime: undefined,
  }));
  
  return {
    routeTemplateId: tripData.routeTemplateId as Id<"routeTemplates">,
    vehicleId: tripData.vehicleId as Id<"vehicles">,
    luggagePolicyId: tripData.luggagePolicyId as Id<"luggagePolicies">,
    departureTime,
    arrivalTime,
    stationSelections,
  };
}

/**
 * Transform update trip form data to convex format
 */
async function transformUpdateTripDataToConvex(tripData: Omit<TripFormData, 'routeTemplateId'>) {
  // Convert date strings to timestamps
  const departureTime = new Date(tripData.departureTime).getTime();
  const arrivalTime = new Date(tripData.arrivalTime).getTime();
  
  // Transform selected stations to convex format
  const stationSelections = tripData.selectedStations.map(station => ({
    routeTemplateCityId: station.routeTemplateCityId as Id<"routeTemplateCities">,
    stationId: station.routeTemplateStationId as Id<"routeTemplateStations">,
    isPickupPoint: station.isPickupPoint,
    isDropoffPoint: station.isDropoffPoint,
    estimatedTime: undefined,
  }));
  
  return {
    vehicleId: tripData.vehicleId as Id<"vehicles">,
    luggagePolicyId: tripData.luggagePolicyId as Id<"luggagePolicies">,
    departureTime,
    arrivalTime,
    stationSelections,
  };
}

/**
 * Format trip duration for display
 */
export const formatTripDuration = (departureTime: string, arrivalTime: string): string => {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  const diffMs = arrival.getTime() - departure.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours === 0) {
    return `${diffMinutes}m`;
  } else if (diffMinutes === 0) {
    return `${diffHours}h`;
  } else {
    return `${diffHours}h ${diffMinutes}m`;
  }
};

/**
 * Get status color for trip badges
 */
export const getStatusColor = (status: Trip['status']): string => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Check if trip is upcoming
 */
export const isUpcomingTrip = (departureTime: string): boolean => {
  return new Date(departureTime) > new Date();
};

/**
 * Check if trip is past
 */
export const isPastTrip = (arrivalTime: string): boolean => {
  return new Date(arrivalTime) < new Date();
}; 