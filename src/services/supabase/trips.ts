import { supabase } from './supabase';

// Types and Interfaces
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
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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
    stationId: string;
    cityName: string;
    sequenceOrder: number;
    isPickupPoint: boolean;
    isDropoffPoint: boolean;
  }>;
}

interface RawTrip {
  id: string;
  route_template_id: string;
  route_templates: { name: string } | null;
  vehicle_id: string | null;
  vehicles: { make: string; model: string; year: number } | null;
  luggage_policy_id: string | null;
  luggage_policies: { name: string } | null;
  departure_time: string;
  arrival_time: string;
  total_seats: number;
  available_seats: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// API Functions

// Get all trips for a driver
export const getDriverTrips = async (): Promise<Trip[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // For now, use a simple query until we fix the RPC function
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      route_templates!inner(name),
      vehicles(make, model, year),
      luggage_policies(name)
    `)
    .eq('driver_id', user.id)
    .order('departure_time', { ascending: false });

  if (error) {
    console.error('Error fetching driver trips:', error);
    throw new Error(error.message);
  }

  // Convert the data to our Trip interface
  return data?.map((trip: RawTrip) => ({
    id: trip.id,
    routeTemplateId: trip.route_template_id,
    routeTemplateName: trip.route_templates?.name || 'Unknown Route',
    vehicleId: trip.vehicle_id,
    vehicleName: trip.vehicles ? `${trip.vehicles.make} ${trip.vehicles.model} (${trip.vehicles.year})` : null,
    luggagePolicyId: trip.luggage_policy_id,
    luggagePolicyName: trip.luggage_policies?.name || null,
    departureTime: trip.departure_time,
    arrivalTime: trip.arrival_time,
    totalSeats: trip.total_seats,
    availableSeats: trip.available_seats,
    status: trip.status,
    createdAt: trip.created_at,
    updatedAt: trip.updated_at,
    routeCities: [], // We'll populate this separately if needed
    tripStations: [], // We'll populate this separately if needed
    reservationsCount: 0, // We'll calculate this separately if needed
    totalEarnings: 0, // We'll calculate this separately if needed
  })) || [];
};

// Get a single trip by ID
export const getTripById = async (id: string): Promise<Trip | null> => {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      route_templates!inner(name),
      vehicles(make, model, year),
      luggage_policies(name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching trip:', error);
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    routeTemplateId: data.route_template_id,
    routeTemplateName: data.route_templates?.name || 'Unknown Route',
    vehicleId: data.vehicle_id,
    vehicleName: data.vehicles ? `${data.vehicles.make} ${data.vehicles.model} (${data.vehicles.year})` : null,
    luggagePolicyId: data.luggage_policy_id,
    luggagePolicyName: data.luggage_policies?.name || null,
    departureTime: data.departure_time,
    arrivalTime: data.arrival_time,
    totalSeats: data.total_seats,
    availableSeats: data.available_seats,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    routeCities: [], // We'll populate this separately if needed
    tripStations: [], // We'll populate this separately if needed
  };
};

// Create a new trip
export const createTrip = async (tripData: TripFormData): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get vehicle capacity for total_seats
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('capacity')
    .eq('id', tripData.vehicleId)
    .single();

  const capacity = vehicle?.capacity || 4;

  // Insert the trip using direct table insert for now
  const { data, error } = await supabase
    .from('trips')
    .insert({
      route_template_id: tripData.routeTemplateId,
      driver_id: user.id,
      vehicle_id: tripData.vehicleId,
      luggage_policy_id: tripData.luggagePolicyId,
      departure_time: tripData.departureTime,
      arrival_time: tripData.arrivalTime,
      total_seats: capacity,
      available_seats: capacity,
      status: 'scheduled'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating trip:', error);
    throw new Error(error.message);
  }

  // Insert selected stations
  if (tripData.selectedStations.length > 0) {
    const stationInserts = tripData.selectedStations.map(station => ({
      trip_id: data.id,
      route_template_station_id: station.stationId,
      city_name: station.cityName,
      sequence_order: station.sequenceOrder,
      is_pickup_point: station.isPickupPoint,
      is_dropoff_point: station.isDropoffPoint
    }));

    const { error: stationsError } = await supabase
      .from('trip_stations')
      .insert(stationInserts);

    if (stationsError) {
      console.error('Error creating trip stations:', stationsError);
      // Clean up the trip if stations failed
      await supabase.from('trips').delete().eq('id', data.id);
      throw new Error(stationsError.message);
    }
  }

  return data.id;
};

// Update an existing trip
export const updateTrip = async (tripId: string, tripData: Omit<TripFormData, 'routeTemplateId'>): Promise<void> => {
  // Get vehicle capacity for total_seats
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('capacity')
    .eq('id', tripData.vehicleId)
    .single();

  const capacity = vehicle?.capacity || 4;

  // Update the trip
  const { error } = await supabase
    .from('trips')
    .update({
      vehicle_id: tripData.vehicleId,
      luggage_policy_id: tripData.luggagePolicyId,
      departure_time: tripData.departureTime,
      arrival_time: tripData.arrivalTime,
      total_seats: capacity,
      updated_at: new Date().toISOString()
    })
    .eq('id', tripId);

  if (error) {
    console.error('Error updating trip:', error);
    throw new Error(error.message);
  }

  // Delete existing trip stations
  await supabase
    .from('trip_stations')
    .delete()
    .eq('trip_id', tripId);

  // Insert updated stations
  if (tripData.selectedStations.length > 0) {
    const stationInserts = tripData.selectedStations.map(station => ({
      trip_id: tripId,
      route_template_station_id: station.stationId,
      city_name: station.cityName,
      sequence_order: station.sequenceOrder,
      is_pickup_point: station.isPickupPoint,
      is_dropoff_point: station.isDropoffPoint
    }));

    const { error: stationsError } = await supabase
      .from('trip_stations')
      .insert(stationInserts);

    if (stationsError) {
      console.error('Error updating trip stations:', stationsError);
      throw new Error(stationsError.message);
    }
  }
};

// Delete a trip
export const deleteTrip = async (tripId: string): Promise<void> => {
  // Check if there are any confirmed reservations
  const { data: reservations, error: reservationError } = await supabase
    .from('reservations')
    .select('id')
    .eq('trip_id', tripId)
    .in('status', ['confirmed', 'pending']);

  if (reservationError) {
    console.error('Error checking reservations:', reservationError);
    throw new Error(reservationError.message);
  }

  if (reservations && reservations.length > 0) {
    throw new Error('Cannot delete trip with confirmed or pending reservations');
  }

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) {
    console.error('Error deleting trip:', error);
    throw new Error(error.message);
  }
};

// Update trip status
export const updateTripStatus = async (tripId: string, status: Trip['status']): Promise<void> => {
  const { error } = await supabase
    .from('trips')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tripId);

  if (error) {
    console.error('Error updating trip status:', error);
    throw new Error(error.message);
  }
};

// Utility functions
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

export const getStatusColor = (status: Trip['status']): string => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const isUpcomingTrip = (departureTime: string): boolean => {
  return new Date(departureTime) > new Date();
};

export const isPastTrip = (arrivalTime: string): boolean => {
  return new Date(arrivalTime) < new Date();
}; 