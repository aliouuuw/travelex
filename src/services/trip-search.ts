import { supabase } from './supabase';
import type { SeatMap } from './vehicles';

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

export interface TripSearchQueryWithCountry extends TripSearchQuery {
  fromCountry?: string;
  toCountry?: string;
}

export interface TripSearchResult {
  tripId: string;
  routeTemplateId: string;
  routeTemplateName: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  vehicleId: string | null;
  vehicleInfo?: {
    id: string;
    make: string;
    model: string;
    year: number;
    type: string;
    capacity: number;
    features?: string[];
  };
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  totalSeats: number;
  routeCities: Array<{
    id: string;
    cityName: string;
    countryCode?: string;
    sequenceOrder: number;
  }>;
  tripStations: Array<{
    id: string;
    cityName: string;
    countryCode?: string;
    sequenceOrder: number;
    stationInfo: {
      id: string;
      name: string;
      address: string;
    };
    isPickupPoint: boolean;
    isDropoffPoint: boolean;
  }>;
  segmentPrice: number;
  fullRoutePrice: number;
  pickupStations: Array<{
    id: string;
    stationInfo: {
      id: string;
      name: string;
      address: string;
    };
  }>;
  dropoffStations: Array<{
    id: string;
    stationInfo: {
      id: string;
      name: string;
      address: string;
    };
  }>;
  luggagePolicy?: {
    id: string;
    name: string;
    freeWeightKg: number;
    excessFeePerKg: number;
    maxBags?: number;
    maxBagWeightKg?: number;
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

export interface CityOption {
  cityName: string;
  tripCount: number;
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
    year: number;
    type: string;
    capacity: number;
    features?: string[];
    seatMap?: SeatMap;
  };
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  totalSeats: number;
  routeCities: Array<{
    id: string;
    cityName: string;
    sequenceOrder: number;
    stations: Array<{
      id: string;
      name: string;
      address: string;
    }>;
  }>;
  tripStations: Array<{
    id: string;
    cityName: string;
    countryCode?: string;
    sequenceOrder: number;
    stationInfo: {
      id: string;
      name: string;
      address: string;
    };
    isPickupPoint: boolean;
    isDropoffPoint: boolean;
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
    maxBags?: number;
    maxBagWeightKg?: number;
  };
}

interface RawTrip {
  trip_id: string;
  route_template_id: string;
  route_template_name: string;
  driver_id: string;
  driver_name: string;
  driver_rating: number;
  vehicle_id: string | null;
  vehicle_info?: {
    id: string;
    make: string;
    model: string;
    year: number;
    type: string;
    capacity: number;
    features?: string[];
  };
  departure_time: string;
  arrival_time: string;
  available_seats: number;
  total_seats: number;
  route_cities?: Array<{
    id: string;
    cityName: string;
    countryCode?: string;
    sequenceOrder: number;
  }>;
  trip_stations?: Array<{
    id: string;
    cityName: string;
    countryCode?: string;
    sequenceOrder: number;
    stationInfo: {
      id: string;
      name: string;
      address: string;
    };
    isPickupPoint: boolean;
    isDropoffPoint: boolean;
  }>;
  segment_price: number;
  full_route_price: number;
  pickup_stations?: Array<{
    id: string;
    stationInfo: {
      id: string;
      name: string;
      address: string;
    };
  }>;
  dropoff_stations?: Array<{
    id: string;
    stationInfo: {
      id: string;
      name: string;
      address: string;
    };
  }>;
  luggage_policy?: {
    id: string;
    name: string;
    freeWeightKg: number;
    excessFeePerKg: number;
    maxBags?: number;
    maxBagWeightKg?: number;
  };
}

interface RawCity {
  city_name: string;
  trip_count: number;
}

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Search for trips based on segment (from city to destination city)
 * Passengers can search "Kumasi to Accra" and find "Tamale → Kumasi → Accra" trips
 */
export const searchTripsBySegment = async (
  query: TripSearchQuery
): Promise<TripSearchResult[]> => {
  const { data, error } = await supabase.rpc('search_trips_by_segment', {
    p_from_city: query.fromCity,
    p_to_city: query.toCity,
    p_departure_date: query.departureDate || null,
    p_min_seats: query.minSeats || 1,
    p_max_price: query.maxPrice || null,
  });

  if (error) {
    console.error('Error searching trips:', error);
    throw new Error(error.message);
  }

  // Transform the data to match our TypeScript interface
  return data?.map((trip: RawTrip) => ({
    tripId: trip.trip_id,
    routeTemplateId: trip.route_template_id,
    routeTemplateName: trip.route_template_name,
    driverId: trip.driver_id,
    driverName: trip.driver_name,
    driverRating: trip.driver_rating || 0,
    vehicleId: trip.vehicle_id,
    vehicleInfo: trip.vehicle_info ? {
      id: trip.vehicle_info.id,
      make: trip.vehicle_info.make,
      model: trip.vehicle_info.model,
      year: trip.vehicle_info.year,
      type: trip.vehicle_info.type,
      capacity: trip.vehicle_info.capacity,
      features: trip.vehicle_info.features || [],
    } : undefined,
    departureTime: trip.departure_time,
    arrivalTime: trip.arrival_time,
    availableSeats: trip.available_seats,
    totalSeats: trip.total_seats,
    routeCities: trip.route_cities || [],
    tripStations: trip.trip_stations || [],
    segmentPrice: trip.segment_price,
    fullRoutePrice: trip.full_route_price,
    pickupStations: trip.pickup_stations || [],
    dropoffStations: trip.dropoff_stations || [],
    luggagePolicy: trip.luggage_policy ? {
      id: trip.luggage_policy.id,
      name: trip.luggage_policy.name,
      freeWeightKg: trip.luggage_policy.freeWeightKg,
      excessFeePerKg: trip.luggage_policy.excessFeePerKg,
      maxBags: trip.luggage_policy.maxBags,
      maxBagWeightKg: trip.luggage_policy.maxBagWeightKg,
    } : undefined,
  })) || [];
};

/**
 * Search for trips with optional country filtering
 * Enhanced version that supports both country-level and city-level search
 */
export const searchTripsBySegmentWithCountry = async (
  query: TripSearchQueryWithCountry
): Promise<TripSearchResult[]> => {
  const { data, error } = await supabase.rpc('search_trips_by_segment_with_country', {
    p_from_country: query.fromCountry || null,
    p_to_country: query.toCountry || null,
    p_from_city: query.fromCity || null,
    p_to_city: query.toCity || null,
    p_departure_date: query.departureDate || null,
    p_min_seats: query.minSeats || 1,
    p_max_price: query.maxPrice || null,
  });

  if (error) {
    console.error('Error searching trips with country:', error);
    throw new Error(error.message);
  }

  // Transform the data to match our TypeScript interface
  return data?.map((trip: RawTrip) => ({
    tripId: trip.trip_id,
    routeTemplateId: trip.route_template_id,
    routeTemplateName: trip.route_template_name,
    driverId: trip.driver_id,
    driverName: trip.driver_name,
    driverRating: trip.driver_rating || 0,
    vehicleId: trip.vehicle_id,
    vehicleInfo: trip.vehicle_info ? {
      id: trip.vehicle_info.id,
      make: trip.vehicle_info.make,
      model: trip.vehicle_info.model,
      year: trip.vehicle_info.year,
      type: trip.vehicle_info.type,
      capacity: trip.vehicle_info.capacity,
      features: trip.vehicle_info.features || [],
    } : undefined,
    departureTime: trip.departure_time,
    arrivalTime: trip.arrival_time,
    availableSeats: trip.available_seats,
    totalSeats: trip.total_seats,
    routeCities: trip.route_cities?.map((city) => ({
      id: city.id,
      cityName: city.cityName,
      countryCode: city.countryCode,
      sequenceOrder: city.sequenceOrder,
    })) || [],
    tripStations: trip.trip_stations?.map((station) => ({
      id: station.id,
      cityName: station.cityName,
      countryCode: station.countryCode,
      sequenceOrder: station.sequenceOrder,
      stationInfo: station.stationInfo,
      isPickupPoint: station.isPickupPoint,
      isDropoffPoint: station.isDropoffPoint,
    })) || [],
    segmentPrice: trip.estimated_price || 0,
    fullRoutePrice: trip.estimated_price || 0,
    pickupStations: trip.pickup_stations || [],
    dropoffStations: trip.dropoff_stations || [],
    luggagePolicy: trip.luggage_policy ? {
      id: trip.luggage_policy.id,
      name: trip.luggage_policy.name,
      freeWeightKg: trip.luggage_policy.freeWeightKg,
      excessFeePerKg: trip.luggage_policy.excessFeePerKg,
      maxBags: trip.luggage_policy.maxBags,
      maxBagWeightKg: trip.luggage_policy.maxBagWeightKg,
    } : undefined,
  })) || [];
};

/**
 * Get available cities for search suggestions
 */
export const getAvailableCities = async (): Promise<CityOption[]> => {
  const { data, error } = await supabase.rpc('get_available_cities');

  if (error) {
    console.error('Error fetching available cities:', error);
    throw new Error(error.message);
  }

  return data?.map((city: RawCity) => ({
    cityName: city.city_name,
    tripCount: city.trip_count,
  })) || [];
};

/**
 * Get detailed trip information for booking
 */
export const getTripForBooking = async (tripId: string): Promise<TripBookingDetails | null> => {
  if (!tripId) return null;

  const { data, error } = await supabase
    .rpc('get_trip_for_booking', { p_trip_id: tripId });

  if (error) {
    console.error('Error fetching trip for booking:', error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const tripData = data[0];

  // Fetch vehicle details separately to get the seat map
  let vehicleSeatMap: SeatMap | undefined = undefined;
  if (tripData.vehicle_id) {
    const { data: vehicleData, error: vehicleError } = await supabase
      .from('vehicles')
      .select('seat_map')
      .eq('id', tripData.vehicle_id)
      .single();

    if (vehicleError) {
      console.error('Error fetching vehicle seat map:', vehicleError);
    } else if (vehicleData) {
      vehicleSeatMap = vehicleData.seat_map as SeatMap;
    }
  }

  return {
    tripId: tripData.trip_id,
    routeTemplateId: tripData.route_template_id,
    routeTemplateName: tripData.route_template_name,
    driverId: tripData.driver_id,
    driverName: tripData.driver_name,
    driverRating: tripData.driver_rating || 0,
    vehicleInfo: tripData.vehicle_info ? {
      ...tripData.vehicle_info,
      features: tripData.vehicle_info.features || [],
      seatMap: vehicleSeatMap
    } : undefined,
    departureTime: tripData.departure_time,
    arrivalTime: tripData.arrival_time,
    availableSeats: tripData.available_seats,
    totalSeats: tripData.total_seats,
    routeCities: tripData.route_cities || [],
    tripStations: tripData.trip_stations || [],
    pricing: tripData.pricing || [],
    luggagePolicy: tripData.luggage_policy || undefined,
  };
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
        const durationA = new Date(a.arrivalTime).getTime() - new Date(a.departureTime).getTime();
        const durationB = new Date(b.arrivalTime).getTime() - new Date(b.departureTime).getTime();
        return durationA - durationB;
      });
    
    case 'rating':
      return sorted.sort((a, b) => b.driverRating - a.driverRating);
    
    default:
      return sorted;
  }
};

/**
 * Calculate trip duration in a human-readable format
 */
export const formatTripDuration = (departureTime: string, arrivalTime: string): string => {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  const durationMs = arrival.getTime() - departure.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Get route path string for display (e.g., "Tamale → Kumasi → Accra")
 */
export const getRoutePathString = (routeCities: Array<{ cityName: string; sequenceOrder: number }>): string => {
  const sortedCities = [...routeCities].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  return sortedCities.map(city => city.cityName).join(' → ');
};

/**
 * Calculate segment pricing for a specific route
 */
export const calculateSegmentPrice = (
  pricing: Array<{ fromCity: string; toCity: string; price: number }>,
  fromCity: string,
  toCity: string
): number => {
  const directSegment = pricing.find(p => p.fromCity === fromCity && p.toCity === toCity);
  return directSegment?.price || 0;
}; 