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

// =============================================
// COUNTRY REQUEST MANAGEMENT
// =============================================

export interface CountryRequest {
  id: string;
  countryName: string;
  countryCode: string;
  requestedBy: string;
  requesterName: string;
  requesterEmail: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
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

/**
 * Submit a country request (for drivers)
 */
export const submitCountryRequest = async (request: {
  countryName: string;
  countryCode: string;
  reason: string;
}): Promise<string> => {
  const { data, error } = await supabase.rpc('submit_country_request', {
    p_country_name: request.countryName,
    p_country_code: request.countryCode.toUpperCase(),
    p_reason: request.reason
  });

  if (error) {
    console.error('Error submitting country request:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Get all country requests (for admin)
 */
export const getCountryRequests = async (status?: 'pending' | 'approved' | 'rejected'): Promise<CountryRequest[]> => {
  const { data, error } = await supabase.rpc('get_country_requests', {
    p_status: status || null
  });

  if (error) {
    console.error('Error fetching country requests:', error);
    throw new Error(error.message);
  }

  return data?.map((request: any) => ({
    id: request.id,
    countryName: request.country_name,
    countryCode: request.country_code,
    requestedBy: request.requested_by,
    requesterName: request.requester_name,
    requesterEmail: request.requester_email,
    reason: request.reason,
    status: request.status,
    adminNotes: request.admin_notes,
    reviewedBy: request.reviewed_by,
    reviewerName: request.reviewer_name,
    reviewedAt: request.reviewed_at,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  })) || [];
};

/**
 * Get my country requests (for drivers)
 */
export const getMyCountryRequests = async (): Promise<MyCountryRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_country_requests');

  if (error) {
    console.error('Error fetching my country requests:', error);
    throw new Error(error.message);
  }

  return data?.map((request: any) => ({
    id: request.id,
    countryName: request.country_name,
    countryCode: request.country_code,
    reason: request.reason,
    status: request.status,
    adminNotes: request.admin_notes,
    createdAt: request.created_at,
    reviewedAt: request.reviewed_at,
  })) || [];
};

/**
 * Approve a country request (admin only)
 */
export const approveCountryRequest = async (requestId: string, flagEmoji?: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('approve_country_request', {
    p_request_id: requestId,
    p_flag_emoji: flagEmoji || null
  });

  if (error) {
    console.error('Error approving country request:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Reject a country request (admin only)
 */
export const rejectCountryRequest = async (requestId: string, adminNotes?: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('reject_country_request', {
    p_request_id: requestId,
    p_admin_notes: adminNotes || null
  });

  if (error) {
    console.error('Error rejecting country request:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Create a country manually (admin only)
 */
export const createCountry = async (country: {
  name: string;
  code: string;
  flagEmoji?: string;
}): Promise<Country> => {
  const { data, error } = await supabase
    .from('countries')
    .insert({
      name: country.name,
      code: country.code.toUpperCase(),
      flag_emoji: country.flagEmoji
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating country:', error);
    throw new Error(error.message);
  }

  return {
    code: data.code,
    name: data.name,
    flagEmoji: data.flag_emoji,
    cityCount: 0,
    tripCount: 0
  };
}; 