import { supabase } from './supabase';
import { extractAndSaveCitiesFromRoute } from './reusable-cities-stations';

// Types matching the database schema
export type RouteTemplateStatus = 'draft' | 'active' | 'inactive';

export interface Station {
  id?: string;
  name: string;
  address: string;
}

export interface CityWithStations {
  cityName: string;
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
  createdAt: string;
  updatedAt: string;
  scheduledTrips: number;
  completedTrips: number;
  totalEarnings: number;
}

// Transform data for database storage
const transformCitiesForDB = (cities: CityWithStations[]) => {
  return cities.map((city, index) => ({
    cityName: city.cityName,
    sequenceOrder: index,
    stations: city.stations
  }));
};

// Get all route templates for a driver
export const getDriverRouteTemplates = async (): Promise<RouteTemplate[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase.rpc('get_driver_route_templates', {
    driver_uuid: user.id
  });

  if (error) {
    console.error('Error fetching route templates:', error);
    throw new Error(error.message);
  }

  return data?.map((template: any) => ({
    id: template.id,
    driverId: template.driver_id,
    name: template.name,
    estimatedDuration: template.estimated_duration,
    basePrice: parseFloat(template.base_price),
    status: template.status,
    cities: template.cities || [],
    intercityFares: template.intercity_fares || [],
    scheduledTrips: parseInt(template.scheduled_trips),
    completedTrips: parseInt(template.completed_trips),
    totalEarnings: parseFloat(template.total_earnings),
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  })) || [];
};

// Get a single route template by ID
export const getRouteTemplateById = async (id: string): Promise<RouteTemplate | null> => {
  const { data, error } = await supabase.rpc('get_route_template_by_id', {
    p_route_template_id: id
  });

  if (error) {
    console.error('Error fetching route template:', error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) return null;

  const template = data[0];
  return {
    id: template.id,
    driverId: template.driver_id,
    name: template.name,
    estimatedDuration: template.estimated_duration,
    basePrice: parseFloat(template.base_price),
    status: template.status,
    cities: template.cities || [],
    intercityFares: template.intercity_fares || [],
    scheduledTrips: 0, // Not included in single fetch
    completedTrips: 0,
    totalEarnings: 0,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
};

// Create a new route template
export const createRouteTemplate = async (
  routeData: RouteTemplateFormData
): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const transformedCities = transformCitiesForDB(routeData.cities);

  const { data, error } = await supabase.rpc('create_route_template', {
    p_driver_id: user.id,
    p_name: routeData.name,
    p_estimated_duration: routeData.estimatedDuration,
    p_base_price: routeData.basePrice,
    p_status: routeData.status,
    p_cities: transformedCities,
    p_intercity_fares: routeData.intercityFares
  });

  if (error) {
    console.error('Error creating route template:', error);
    throw new Error(error.message);
  }

  // Save cities and stations to reusable collection
  try {
    await extractAndSaveCitiesFromRoute(routeData.cities);
  } catch (extractError) {
    console.warn('Failed to save reusable cities/stations:', extractError);
    // Don't fail the route creation if reusable save fails
  }

  return data;
};

// Update an existing route template
export const updateRouteTemplate = async (
  id: string,
  routeData: RouteTemplateFormData
): Promise<boolean> => {
  const transformedCities = transformCitiesForDB(routeData.cities);

  const { data, error } = await supabase.rpc('update_route_template', {
    p_route_template_id: id,
    p_name: routeData.name,
    p_estimated_duration: routeData.estimatedDuration,
    p_base_price: routeData.basePrice,
    p_status: routeData.status,
    p_cities: transformedCities,
    p_intercity_fares: routeData.intercityFares
  });

  if (error) {
    console.error('Error updating route template:', error);
    throw new Error(error.message);
  }

  // Save cities and stations to reusable collection
  try {
    await extractAndSaveCitiesFromRoute(routeData.cities);
  } catch (extractError) {
    console.warn('Failed to save reusable cities/stations:', extractError);
    // Don't fail the route update if reusable save fails
  }

  return data;
};

// Delete a route template
export const deleteRouteTemplate = async (id: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('delete_route_template', {
    p_route_template_id: id
  });

  if (error) {
    console.error('Error deleting route template:', error);
    throw new Error(error.message);
  }

  return data;
};

// Toggle route template status (activate/deactivate)
export const toggleRouteTemplateStatus = async (
  id: string,
  newStatus: RouteTemplateStatus
): Promise<boolean> => {
  const { error } = await supabase
    .from('route_templates')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating route template status:', error);
    throw new Error(error.message);
  }

  return true;
}; 