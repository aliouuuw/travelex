import { supabase } from './supabase';

// Types
export interface Reservation {
  id: string;
  tripId: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone?: string;
  pickupStationId: string;
  pickupStationName: string;
  pickupStationAddress: string;
  pickupCityName: string;
  dropoffStationId: string;
  dropoffStationName: string;
  dropoffStationAddress: string;
  dropoffCityName: string;
  seatsReserved: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  bookingReference: string;
  createdAt: string;
  updatedAt: string;
  // Trip details for context
  tripDepartureTime: string;
  tripArrivalTime: string;
  tripStatus: string;
  routeTemplateName: string;
  vehicleName?: string;
}

export interface ReservationFilters {
  status?: string;
  tripId?: string;
  passengerName?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ReservationStats {
  totalReservations: number;
  confirmedReservations: number;
  pendingReservations: number;
  cancelledReservations: number;
  completedReservations: number;
  totalRevenue: number;
  totalPassengers: number;
}

interface RawReservation {
  id: string;
  trip_id: string;
  passenger_id: string;
  pickup_station_id: string;
  dropoff_station_id: string;
  seats_reserved: number;
  total_price: number;
  status: string;
  booking_reference: string;
  created_at: string;
  updated_at: string;
  trips: {
    departure_time: string;
    arrival_time: string;
    status: string;
    route_templates: { name: string }[];
    vehicles: { make: string; model: string; year: number }[];
  }[];
  pickup_station: {
    city_name: string;
    route_template_stations: { station_name: string; station_address: string }[];
  }[];
  dropoff_station: {
    city_name: string;
    route_template_stations: { station_name: string; station_address: string }[];
  }[];
  passenger: {
    full_name: string;
    email: string;
    phone?: string;
  }[];
}

// API Functions

// Get all reservations for a driver's trips
export const getDriverReservations = async (filters?: ReservationFilters): Promise<Reservation[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('reservations')
    .select(`
      id,
      trip_id,
      passenger_id,
      pickup_station_id,
      dropoff_station_id,
      seats_reserved,
      total_price,
      status,
      booking_reference,
      created_at,
      updated_at,
      trips!inner(
        departure_time,
        arrival_time,
        status,
        driver_id,
        route_templates!inner(name),
        vehicles(make, model, year)
      ),
      pickup_station:trip_stations!pickup_station_id(
        id,
        route_template_station_id,
        city_name,
        route_template_stations!inner(station_name, station_address)
      ),
      dropoff_station:trip_stations!dropoff_station_id(
        id,
        route_template_station_id,
        city_name,
        route_template_stations!inner(station_name, station_address)
      ),
      passenger:profiles!passenger_id(
        full_name,
        email,
        phone
      )
    `)
    .eq('trips.driver_id', user.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.tripId) {
    query = query.eq('trip_id', filters.tripId);
  }

  if (filters?.dateRange) {
    query = query
      .gte('trips.departure_time', filters.dateRange.start)
      .lte('trips.departure_time', filters.dateRange.end);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching driver reservations:', error);
    throw new Error(error.message);
  }

  // Transform the data to our Reservation interface
  return data?.map((reservation: RawReservation) => ({
    id: reservation.id,
    tripId: reservation.trip_id,
    passengerId: reservation.passenger_id,
    passengerName: reservation.passenger[0]?.full_name || 'Unknown Passenger',
    passengerEmail: reservation.passenger[0]?.email || '',
    passengerPhone: reservation.passenger[0]?.phone || undefined,
    pickupStationId: reservation.pickup_station_id,
    pickupStationName: reservation.pickup_station[0]?.route_template_stations[0]?.station_name || 'Unknown Station',
    pickupStationAddress: reservation.pickup_station[0]?.route_template_stations[0]?.station_address || '',
    pickupCityName: reservation.pickup_station[0]?.city_name || 'Unknown City',
    dropoffStationId: reservation.dropoff_station_id,
    dropoffStationName: reservation.dropoff_station[0]?.route_template_stations[0]?.station_name || 'Unknown Station',
    dropoffStationAddress: reservation.dropoff_station[0]?.route_template_stations[0]?.station_address || '',
    dropoffCityName: reservation.dropoff_station[0]?.city_name || 'Unknown City',
    seatsReserved: reservation.seats_reserved,
    totalPrice: reservation.total_price,
    status: reservation.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
    bookingReference: reservation.booking_reference,
    createdAt: reservation.created_at,
    updatedAt: reservation.updated_at,
    tripDepartureTime: reservation.trips[0]?.departure_time || '',
    tripArrivalTime: reservation.trips[0]?.arrival_time || '',
    tripStatus: reservation.trips[0]?.status || '',
    routeTemplateName: reservation.trips[0]?.route_templates[0]?.name || 'Unknown Route',
    vehicleName: reservation.trips[0]?.vehicles[0] 
      ? `${reservation.trips[0].vehicles[0].make} ${reservation.trips[0].vehicles[0].model} (${reservation.trips[0].vehicles[0].year})`
      : undefined,
  })) || [];
};

// Get reservation statistics for a driver
export const getDriverReservationStats = async (): Promise<ReservationStats> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      status,
      total_price,
      seats_reserved,
      trips!inner(driver_id)
    `)
    .eq('trips.driver_id', user.id);

  if (error) {
    console.error('Error fetching reservation stats:', error);
    throw new Error(error.message);
  }

  const stats: ReservationStats = {
    totalReservations: data?.length || 0,
    confirmedReservations: data?.filter(r => r.status === 'confirmed').length || 0,
    pendingReservations: data?.filter(r => r.status === 'pending').length || 0,
    cancelledReservations: data?.filter(r => r.status === 'cancelled').length || 0,
    completedReservations: data?.filter(r => r.status === 'completed').length || 0,
    totalRevenue: data?.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.total_price, 0) || 0,
    totalPassengers: data?.reduce((sum, r) => sum + r.seats_reserved, 0) || 0,
  };

  return stats;
};

// Update reservation status
export const updateReservationStatus = async (
  reservationId: string, 
  status: 'confirmed' | 'cancelled' | 'completed'
): Promise<void> => {
  const { error } = await supabase
    .from('reservations')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', reservationId);

  if (error) {
    console.error('Error updating reservation status:', error);
    throw new Error(error.message);
  }
};

// Get single reservation by ID with full details
export const getReservationById = async (reservationId: string): Promise<Reservation | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id,
      trip_id,
      passenger_id,
      pickup_station_id,
      dropoff_station_id,
      seats_reserved,
      total_price,
      status,
      booking_reference,
      created_at,
      updated_at,
      trips!inner(
        departure_time,
        arrival_time,
        status,
        driver_id,
        route_templates!inner(name),
        vehicles(make, model, year)
      ),
      pickup_station:trip_stations!pickup_station_id(
        id,
        route_template_station_id,
        city_name,
        route_template_stations!inner(station_name, station_address)
      ),
      dropoff_station:trip_stations!dropoff_station_id(
        id,
        route_template_station_id,
        city_name,
        route_template_stations!inner(station_name, station_address)
      ),
      passenger:profiles!passenger_id(
        full_name,
        email,
        phone
      )
    `)
    .eq('id', reservationId)
    .eq('trips.driver_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching reservation:', error);
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    tripId: data.trip_id,
    passengerId: data.passenger_id,
    passengerName: data.passenger[0]?.full_name || 'Unknown Passenger',
    passengerEmail: data.passenger[0]?.email || '',
    passengerPhone: data.passenger[0]?.phone || undefined,
    pickupStationId: data.pickup_station_id,
    pickupStationName: data.pickup_station[0]?.route_template_stations[0]?.station_name || 'Unknown Station',
    pickupStationAddress: data.pickup_station[0]?.route_template_stations[0]?.station_address || '',
    pickupCityName: data.pickup_station[0]?.city_name || 'Unknown City',
    dropoffStationId: data.dropoff_station_id,
    dropoffStationName: data.dropoff_station[0]?.route_template_stations[0]?.station_name || 'Unknown Station',
    dropoffStationAddress: data.dropoff_station[0]?.route_template_stations[0]?.station_address || '',
    dropoffCityName: data.dropoff_station[0]?.city_name || 'Unknown City',
    seatsReserved: data.seats_reserved,
    totalPrice: data.total_price,
    status: data.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
    bookingReference: data.booking_reference,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    tripDepartureTime: data.trips[0]?.departure_time || '',
    tripArrivalTime: data.trips[0]?.arrival_time || '',
    tripStatus: data.trips[0]?.status || '',
    routeTemplateName: data.trips[0]?.route_templates[0]?.name || 'Unknown Route',
    vehicleName: data.trips[0]?.vehicles[0] 
      ? `${data.trips[0].vehicles[0].make} ${data.trips[0].vehicles[0].model} (${data.trips[0].vehicles[0].year})`
      : undefined,
  };
};

// Get reservations for a specific trip
export const getTripReservations = async (tripId: string): Promise<Reservation[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id,
      trip_id,
      passenger_id,
      pickup_station_id,
      dropoff_station_id,
      seats_reserved,
      total_price,
      status,
      booking_reference,
      created_at,
      updated_at,
      trips!inner(
        departure_time,
        arrival_time,
        status,
        driver_id,
        route_templates!inner(name),
        vehicles(make, model, year)
      ),
      pickup_station:trip_stations!pickup_station_id(
        id,
        route_template_station_id,
        city_name,
        route_template_stations!inner(station_name, station_address)
      ),
      dropoff_station:trip_stations!dropoff_station_id(
        id,
        route_template_station_id,
        city_name,
        route_template_stations!inner(station_name, station_address)
      ),
      passenger:profiles!passenger_id(
        full_name,
        email,
        phone
      )
    `)
    .eq('trip_id', tripId)
    .eq('trips.driver_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trip reservations:', error);
    throw new Error(error.message);
  }

  return data?.map((reservation: RawReservation) => ({
    id: reservation.id,
    tripId: reservation.trip_id,
    passengerId: reservation.passenger_id,
    passengerName: reservation.passenger[0]?.full_name || 'Unknown Passenger',
    passengerEmail: reservation.passenger[0]?.email || '',
    passengerPhone: reservation.passenger[0]?.phone || undefined,
    pickupStationId: reservation.pickup_station_id,
    pickupStationName: reservation.pickup_station[0]?.route_template_stations[0]?.station_name || 'Unknown Station',
    pickupStationAddress: reservation.pickup_station[0]?.route_template_stations[0]?.station_address || '',
    pickupCityName: reservation.pickup_station[0]?.city_name || 'Unknown City',
    dropoffStationId: reservation.dropoff_station_id,
    dropoffStationName: reservation.dropoff_station[0]?.route_template_stations[0]?.station_name || 'Unknown Station',
    dropoffStationAddress: reservation.dropoff_station[0]?.route_template_stations[0]?.station_address || '',
    dropoffCityName: reservation.dropoff_station[0]?.city_name || 'Unknown City',
    seatsReserved: reservation.seats_reserved,
    totalPrice: reservation.total_price,
    status: reservation.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
    bookingReference: reservation.booking_reference,
    createdAt: reservation.created_at,
    updatedAt: reservation.updated_at,
    tripDepartureTime: reservation.trips[0]?.departure_time || '',
    tripArrivalTime: reservation.trips[0]?.arrival_time || '',
    tripStatus: reservation.trips[0]?.status || '',
    routeTemplateName: reservation.trips[0]?.route_templates[0]?.name || 'Unknown Route',
    vehicleName: reservation.trips[0]?.vehicles[0] 
      ? `${reservation.trips[0].vehicles[0].make} ${reservation.trips[0].vehicles[0].model} (${reservation.trips[0].vehicles[0].year})`
      : undefined,
  })) || [];
};

// Create a new reservation (for passenger bookings)
export interface CreateReservationData {
  tripId: string;
  pickupStationId: string;
  dropoffStationId: string;
  selectedSeats: string[];
  numberOfBags: number; // Changed from luggageWeight to numberOfBags
  totalPrice: number;
  passengerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
}

export const createReservation = async (data: CreateReservationData): Promise<{ id: string; bookingReference: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Generate a unique booking reference
  const bookingReference = 'TRX-' + Math.random().toString(36).substr(2, 9).toUpperCase();

  // Update user profile if needed
  if (user.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: data.passengerInfo.fullName,
        email: data.passengerInfo.email,
        phone: data.passengerInfo.phone,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.warn('Failed to update profile:', profileError);
    }
  }

  // Create the reservation
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      trip_id: data.tripId,
      passenger_id: user.id,
      pickup_station_id: data.pickupStationId,
      dropoff_station_id: data.dropoffStationId,
      seats_reserved: data.selectedSeats.length,
      total_price: data.totalPrice,
      booking_reference: bookingReference,
      status: 'pending'
    })
    .select('id, booking_reference')
    .single();

  if (error) {
    console.error('Error creating reservation:', error);
    throw new Error(error.message);
  }

  // Create booked seats entries
  if (data.selectedSeats.length > 0) {
    const seatEntries = data.selectedSeats.map(seatNumber => ({
      reservation_id: reservation.id,
      seat_number: seatNumber
    }));

    const { error: seatError } = await supabase
      .from('booked_seats')
      .insert(seatEntries);

    if (seatError) {
      console.warn('Failed to save seat selections:', seatError);
    }
  }

  // Update trip available seats
  const { error: tripUpdateError } = await supabase.rpc('update_trip_available_seats', {
    trip_id: data.tripId,
    seats_to_reserve: data.selectedSeats.length
  });

  if (tripUpdateError) {
    console.warn('Failed to update trip available seats:', tripUpdateError);
  }

  return {
    id: reservation.id,
    bookingReference: reservation.booking_reference
  };
}; 