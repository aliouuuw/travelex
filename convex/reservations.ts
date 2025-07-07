import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Types for the reservation interface
export interface DriverReservation {
  _id: Id<"reservations">;
  tripId: string;
  passengerId?: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
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
  createdAt: number;
  updatedAt: number;
  // Trip details for context
  tripDepartureTime: number;
  tripArrivalTime?: number;
  tripStatus: string;
  routeTemplateName: string;
  vehicleName?: string;
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

// Get all reservations for a driver's trips
export const getDriverReservations = query({
  args: {
    status: v.optional(v.string()),
    tripId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Get user's profile first
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get all trips for this driver
    const driverTrips = await ctx.db
      .query("trips")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();

    if (driverTrips.length === 0) {
      return [];
    }

    const tripIds = driverTrips.map(trip => trip._id);

    // Get all reservations for driver's trips
    const allReservations = await ctx.db.query("reservations").collect();
    
    // Filter reservations for driver's trips
    let driverReservations = allReservations.filter(reservation => 
      tripIds.includes(reservation.tripId as Id<"trips">)
    );

    // Apply status filter
    if (args.status) {
      driverReservations = driverReservations.filter(reservation => 
        reservation.status === args.status
      );
    }

    // Apply trip filter
    if (args.tripId) {
      driverReservations = driverReservations.filter(reservation => 
        reservation.tripId === args.tripId
      );
    }

    // Enrich with trip and station details
    const enrichedReservations: DriverReservation[] = [];

    for (const reservation of driverReservations) {
      const trip = driverTrips.find(t => t._id === reservation.tripId);
      if (!trip) continue;

      // Get route template info
      const routeTemplate = await ctx.db.get(trip.routeTemplateId);
      
      // Get pickup station details
      const pickupStation = await ctx.db.get(reservation.pickupStationId as Id<"tripStations">);
      const dropoffStation = await ctx.db.get(reservation.dropoffStationId as Id<"tripStations">);

      // Get vehicle info
      const vehicle = await ctx.db.get(trip.vehicleId);

      // Get booked seats count
      const bookedSeats = await ctx.db
        .query("bookedSeats")
        .withIndex("by_reservation", (q) => q.eq("reservationId", reservation._id))
        .collect();

      enrichedReservations.push({
        _id: reservation._id,
        tripId: reservation.tripId,
        passengerId: reservation.passengerId,
        passengerName: reservation.passengerName,
        passengerEmail: reservation.passengerEmail,
        passengerPhone: reservation.passengerPhone,
        pickupStationId: reservation.pickupStationId,
        pickupStationName: pickupStation?.cityName || "Unknown Station",
        pickupStationAddress: "", // Not available in tripStations schema
        pickupCityName: pickupStation?.cityName || "Unknown City",
        dropoffStationId: reservation.dropoffStationId,
        dropoffStationName: dropoffStation?.cityName || "Unknown Station", 
        dropoffStationAddress: "", // Not available in tripStations schema
        dropoffCityName: dropoffStation?.cityName || "Unknown City",
        seatsReserved: bookedSeats.length,
        totalPrice: reservation.totalPrice,
        status: reservation.status,
        bookingReference: reservation.bookingReference,
        createdAt: reservation._creationTime,
        updatedAt: reservation.updatedAt || reservation._creationTime,
        tripDepartureTime: trip.departureTime,
        tripArrivalTime: trip.arrivalTime,
        tripStatus: trip.status,
        routeTemplateName: routeTemplate?.name || "Unknown Route",
        vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : undefined,
      });
    }

    // Sort by creation time (newest first)
    return enrichedReservations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get reservation statistics for a driver
export const getDriverReservationStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get all trips for this driver
    const driverTrips = await ctx.db
      .query("trips")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();

    if (driverTrips.length === 0) {
      return {
        totalReservations: 0,
        confirmedReservations: 0,
        pendingReservations: 0,
        cancelledReservations: 0,
        completedReservations: 0,
        totalRevenue: 0,
        totalPassengers: 0,
      };
    }

    const tripIds = driverTrips.map(trip => trip._id);

    // Get all reservations for driver's trips
    const allReservations = await ctx.db.query("reservations").collect();
    const driverReservations = allReservations.filter(reservation => 
      tripIds.includes(reservation.tripId as Id<"trips">)
    );

    const stats: ReservationStats = {
      totalReservations: driverReservations.length,
      confirmedReservations: driverReservations.filter(r => r.status === 'confirmed').length,
      pendingReservations: driverReservations.filter(r => r.status === 'pending').length,
      cancelledReservations: driverReservations.filter(r => r.status === 'cancelled').length,
      completedReservations: driverReservations.filter(r => r.status === 'completed').length,
      totalRevenue: driverReservations
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + r.totalPrice, 0),
      totalPassengers: driverReservations
        .filter(r => r.status !== 'cancelled')
        .length, // Each reservation is one passenger for now
    };

    return stats;
  },
});

// Update reservation status
export const updateReservationStatus = mutation({
  args: {
    reservationId: v.id("reservations"),
    status: v.union(v.literal("confirmed"), v.literal("cancelled"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Verify this reservation belongs to the driver's trip
    const trip = await ctx.db.get(reservation.tripId as Id<"trips">);
    if (!trip || trip.driverId !== profile._id) {
      throw new Error("Unauthorized: This reservation doesn't belong to your trips");
    }

    // Update the reservation status with timestamp
    await ctx.db.patch(args.reservationId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get reservation by ID
export const getReservationById = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      return null;
    }

    // Verify this reservation belongs to the driver's trip
    const trip = await ctx.db.get(reservation.tripId as Id<"trips">);
    if (!trip || trip.driverId !== profile._id) {
      throw new Error("Unauthorized: This reservation doesn't belong to your trips");
    }

    // Get route template info
    const routeTemplate = await ctx.db.get(trip.routeTemplateId);
    
    // Get pickup and dropoff station details
    const pickupStation = await ctx.db.get(reservation.pickupStationId as Id<"tripStations">);
    const dropoffStation = await ctx.db.get(reservation.dropoffStationId as Id<"tripStations">);

    // Get vehicle info
    const vehicle = await ctx.db.get(trip.vehicleId);

    // Get booked seats
    const bookedSeats = await ctx.db
      .query("bookedSeats")
      .withIndex("by_reservation", (q) => q.eq("reservationId", reservation._id))
      .collect();

    const enrichedReservation: DriverReservation = {
      _id: reservation._id,
      tripId: reservation.tripId,
      passengerId: reservation.passengerId,
      passengerName: reservation.passengerName,
      passengerEmail: reservation.passengerEmail,
      passengerPhone: reservation.passengerPhone,
      pickupStationId: reservation.pickupStationId,
      pickupStationName: pickupStation?.cityName || "Unknown Station",
      pickupStationAddress: "", // Not available in tripStations schema
      pickupCityName: pickupStation?.cityName || "Unknown City",
      dropoffStationId: reservation.dropoffStationId,
      dropoffStationName: dropoffStation?.cityName || "Unknown Station",
      dropoffStationAddress: "", // Not available in tripStations schema
      dropoffCityName: dropoffStation?.cityName || "Unknown City",
      seatsReserved: bookedSeats.length,
      totalPrice: reservation.totalPrice,
      status: reservation.status,
      bookingReference: reservation.bookingReference,
      createdAt: reservation._creationTime,
      updatedAt: reservation.updatedAt || reservation._creationTime,
      tripDepartureTime: trip.departureTime,
      tripArrivalTime: trip.arrivalTime,
      tripStatus: trip.status,
      routeTemplateName: routeTemplate?.name || "Unknown Route",
      vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : undefined,
    };

    return enrichedReservation;
  },
});

// Get reservations for a specific trip
export const getTripReservations = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Verify this trip belongs to the driver
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.driverId !== profile._id) {
      throw new Error("Unauthorized: This trip doesn't belong to you");
    }

    // Get all reservations for this trip
    const reservations = await ctx.db
      .query("reservations")
      .collect();

    const tripReservations = reservations.filter(reservation => 
      reservation.tripId === args.tripId
    );

    // Enrich with details
    const enrichedReservations: DriverReservation[] = [];

    for (const reservation of tripReservations) {
      const routeTemplate = await ctx.db.get(trip.routeTemplateId);
      const pickupStation = await ctx.db.get(reservation.pickupStationId as Id<"tripStations">);
      const dropoffStation = await ctx.db.get(reservation.dropoffStationId as Id<"tripStations">);
      const vehicle = await ctx.db.get(trip.vehicleId);
      
      const bookedSeats = await ctx.db
        .query("bookedSeats")
        .withIndex("by_reservation", (q) => q.eq("reservationId", reservation._id))
        .collect();

      enrichedReservations.push({
        _id: reservation._id,
        tripId: reservation.tripId,
        passengerId: reservation.passengerId,
        passengerName: reservation.passengerName,
        passengerEmail: reservation.passengerEmail,
        passengerPhone: reservation.passengerPhone,
        pickupStationId: reservation.pickupStationId,
        pickupStationName: pickupStation?.cityName || "Unknown Station",
        pickupStationAddress: "", // Not available in tripStations schema
        pickupCityName: pickupStation?.cityName || "Unknown City",
        dropoffStationId: reservation.dropoffStationId,
        dropoffStationName: dropoffStation?.cityName || "Unknown Station",
        dropoffStationAddress: "", // Not available in tripStations schema
        dropoffCityName: dropoffStation?.cityName || "Unknown City",
        seatsReserved: bookedSeats.length,
        totalPrice: reservation.totalPrice,
        status: reservation.status,
        bookingReference: reservation.bookingReference,
        createdAt: reservation._creationTime,
        updatedAt: reservation.updatedAt || reservation._creationTime,
        tripDepartureTime: trip.departureTime,
        tripArrivalTime: trip.arrivalTime,
        tripStatus: trip.status,
        routeTemplateName: routeTemplate?.name || "Unknown Route",
        vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : undefined,
      });
    }

    return enrichedReservations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Query to get reservation by temp booking ID (for booking success page)
export const getReservationByTempBookingId = query({
  args: { tempBookingId: v.id("tempBookings") },
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("reservations")
      .withIndex("by_temp_booking_id", (q) => q.eq("tempBookingId", args.tempBookingId))
      .first();
    
    if (!reservation) {
      return null;
    }
    
    // Get booked seats for this reservation
    const bookedSeats = await ctx.db
      .query("bookedSeats")
      .withIndex("by_reservation", (q) => q.eq("reservationId", reservation._id))
      .collect();

    return {
      ...reservation,
      selectedSeats: bookedSeats.map(seat => seat.seatNumber),
    };
  },
}); 