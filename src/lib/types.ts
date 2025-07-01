// Types for TravelEx Trip Search System

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Station {
  id: number;
  name: string;
  address: string;
}

export interface CityWithStations {
  id: number;
  name: string;
  countryCode?: string;
  countryName?: string;
  flagEmoji?: string;
  sequenceOrder?: number;
  stations: Station[];
}

export interface TripSearchResult {
  trip: {
    id: string;
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
    departureDate: string;
    arrivalDate: string;
    availableSeats: number;
    totalSeats: number;
    originStationId: number;
    destinationStationId: number;
  };
  pricing: {
    total: number;
    breakdown: {
      baseFarePerPerson: number;
      extraBagPrice: number;
      serviceFeePerPerson: number;
      totalBeforeTax: number;
      taxAmount: number;
    };
  };
  availableSeats: number;
}

// For backward compatibility with current search system
export interface TripSearchQuery {
  fromCity: string;
  toCity: string;
  departureDate?: string;
  minSeats?: number;
  maxPrice?: number;
}

export interface TripSearchQueryWithCountry extends TripSearchQuery {
  fromCountry: string;
  toCountry: string;
}

export interface SearchFormData {
  fromCity: string;
  toCity: string;
  departureDate: Date | undefined;
  passengers: number;
} 