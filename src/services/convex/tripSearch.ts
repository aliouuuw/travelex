import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface TripSearchQuery {
  fromCity: string;
  toCity: string;
  departureDate?: string; // YYYY-MM-DD format
  minSeats?: number;
  maxPrice?: number;
}

export interface TripSearchQueryWithCountry {
  fromCountry: string;
  toCountry: string;
  fromCity: string;
  toCity: string;
  departureDate?: string; // YYYY-MM-DD format
  minSeats?: number;
  maxPrice?: number;
}

export interface TripSearchResult {
  tripId: string;
  routeTemplateId: string;
  routeTemplateName: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  vehicleId: string;
  vehicleInfo?: {
    id: string;
    make: string;
    model: string;
    year?: number;
    type?: string;
    capacity: number;
    features?: string[];
  };
  departureTime: string;
  arrivalTime?: string;
  availableSeats: number;
  totalSeats: number;
  routeCities: string[];
  tripStations: Array<{
    id: string;
    cityName: string;
    countryCode: string;
    stationName: string;
    stationAddress: string;
    sequenceOrder: number;
    isPickupPoint: boolean;
    isDropoffPoint: boolean;
    estimatedTime?: number;
  }>;
  segmentPrice: number;
  fullRoutePrice: number;
  pickupStations: Array<{
    id: string;
    cityName: string;
    stationName: string;
    stationAddress: string;
  }>;
  dropoffStations: Array<{
    id: string;
    cityName: string;
    stationName: string;
    stationAddress: string;
  }>;
  luggagePolicy?: {
    id: string;
    name: string;
    freeWeightKg: number;
    excessFeePerKg: number;
    maxBags: number;
    maxBagWeightKg?: number;
  };
}

export interface TripBookingDetails {
  tripId: string;
  routeTemplateId: string;
  routeTemplateName: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  vehicleInfo?: {
    id: string;
    make: string;
    model: string;
    year?: number;
    type?: string;
    capacity: number;
    features?: string[];
    seatMap?: any;
  };
  departureTime: string;
  arrivalTime?: string;
  availableSeats: number;
  totalSeats: number;
  routeCities: string[];
  tripStations: Array<{
    id: string;
    cityName: string;
    countryCode: string;
    stationName: string;
    stationAddress: string;
    sequenceOrder: number;
    isPickupPoint: boolean;
    isDropoffPoint: boolean;
    estimatedTime?: number;
  }>;
  pricing: Array<{
    fromCity: string;
    toCity: string;
    price: number;
  }>;
  luggagePolicy?: {
    id: string;
    name: string;
    freeWeightKg: number;
    excessFeePerKg: number;
    maxBags: number;
    maxBagSize?: string;
  };
}

export interface TripSearchFilters {
  vehicleType?: string;
  maxPrice?: number;
  minSeats?: number;
  departureTimeRange?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  minDriverRating?: number;
}

// =============================================
// REACT HOOKS
// =============================================

/**
 * Hook to search for trips based on city pair and optional filters
 */
export const useSearchTrips = (
  fromCity: string,
  toCity: string,
  departureDate?: string,
  minSeats?: number,
  maxPrice?: number
) => {
  return useQuery(
    api.tripSearch.searchTripsBySegment,
    fromCity && toCity 
      ? {
          fromCity,
          toCity,
          departureDate,
          minSeats,
          maxPrice,
        }
      : "skip"
  );
};

/**
 * Hook to get detailed trip information for booking
 */
export const useTripForBooking = (tripId: string) => {
  return useQuery(
    api.tripSearch.getTripForBooking,
    tripId ? { tripId: tripId as any } : "skip"
  );
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Search for trips based on segment (for backward compatibility)
 */
export const searchTripsBySegment = async (
  query: TripSearchQuery
): Promise<TripSearchResult[]> => {
  // This is a placeholder - in practice, you'd use the useSearchTrips hook
  // or call the Convex function directly in a server context
  throw new Error("Use useSearchTrips hook instead");
};

/**
 * Search for trips with country filtering (for backward compatibility)
 */
export const searchTripsBySegmentWithCountry = async (
  query: TripSearchQueryWithCountry
): Promise<TripSearchResult[]> => {
  // This is a placeholder - in practice, you'd use the useSearchTrips hook
  // The country filtering is handled by the city selection
  throw new Error("Use useSearchTrips hook instead");
};

/**
 * Get detailed trip information for booking (for backward compatibility)
 */
export const getTripForBooking = async (tripId: string): Promise<TripBookingDetails | null> => {
  // This is a placeholder - in practice, you'd use the useTripForBooking hook
  throw new Error("Use useTripForBooking hook instead");
};

/**
 * Apply client-side filters to search results
 */
export const applyTripFilters = (
  trips: TripSearchResult[],
  filters: TripSearchFilters
): TripSearchResult[] => {
  return trips.filter((trip) => {
    // Vehicle type filter
    if (filters.vehicleType && trip.vehicleInfo?.type !== filters.vehicleType) {
      return false;
    }

    // Price filter (already applied server-side, but can be refined)
    if (filters.maxPrice && trip.segmentPrice > filters.maxPrice) {
      return false;
    }

    // Minimum seats filter (already applied server-side)
    if (filters.minSeats && trip.availableSeats < filters.minSeats) {
      return false;
    }

    // Departure time range filter
    if (filters.departureTimeRange) {
      const departureTime = new Date(trip.departureTime);
      const timeString = departureTime.toTimeString().substring(0, 5); // HH:MM format
      
      if (timeString < filters.departureTimeRange.start || timeString > filters.departureTimeRange.end) {
        return false;
      }
    }

    // Minimum driver rating filter
    if (filters.minDriverRating && trip.driverRating < filters.minDriverRating) {
      return false;
    }

    return true;
  });
};

/**
 * Sort trip search results by various criteria
 */
export const sortTripResults = (
  trips: TripSearchResult[],
  sortBy: 'price' | 'departure' | 'duration' | 'rating' = 'departure'
): TripSearchResult[] => {
  const sorted = [...trips];

  switch (sortBy) {
    case 'price':
      return sorted.sort((a, b) => a.segmentPrice - b.segmentPrice);
    
    case 'departure':
      return sorted.sort((a, b) => 
        new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
      );
    
    case 'duration':
      return sorted.sort((a, b) => {
        const durationA = new Date(a.arrivalTime || a.departureTime).getTime() - new Date(a.departureTime).getTime();
        const durationB = new Date(b.arrivalTime || b.departureTime).getTime() - new Date(b.departureTime).getTime();
        return durationA - durationB;
      });
    
    case 'rating':
      return sorted.sort((a, b) => b.driverRating - a.driverRating);
    
    default:
      return sorted;
  }
};

/**
 * Format trip duration for display
 */
export const formatTripDuration = (departureTime: string, arrivalTime?: string): string => {
  if (!arrivalTime) return "Duration not specified";
  
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  const durationMs = arrival.getTime() - departure.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Get route path string from cities array
 */
export const getRoutePathString = (cities: string[]): string => {
  if (cities.length === 0) return "";
  if (cities.length === 1) return cities[0];
  if (cities.length === 2) return `${cities[0]} → ${cities[1]}`;
  
  return `${cities[0]} → ... → ${cities[cities.length - 1]}`;
}; 