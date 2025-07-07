import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    seatMap?: {
      rows: number;
      columns: number;
      layout: Array<{
        row: number;
        seats: Array<{
          id: string;
          row: number;
          column: number;
          type: 'regular' | 'disabled' | 'empty';
          available: boolean;
        }>;
      }>;
    };
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
    seatMap?: {
      rows: number;
      columns: number;
      layout: Array<{
        row: number;
        seats: Array<{
          id: string;
          row: number;
          column: number;
          type: 'regular' | 'disabled' | 'empty';
          available: boolean;
        }>;
      }>;
    };
  };
  departureTime: string;
  arrivalTime?: string;
  availableSeats: number;
  totalSeats: number;
  bookedSeats: string[];
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

// =============================================
// HELPER FUNCTIONS
// =============================================

const getDriverProfile = async (ctx: QueryCtx, driverId: Id<"profiles">) => {
  const profile = await ctx.db.get(driverId);
  if (!profile) {
    throw new ConvexError("Driver not found");
  }
  return profile;
};

const getVehicleInfo = async (ctx: QueryCtx, vehicleId: Id<"vehicles">) => {
  const vehicle = await ctx.db.get(vehicleId);
  if (!vehicle) {
    throw new ConvexError("Vehicle not found");
  }
  return vehicle;
};

const getLuggagePolicy = async (ctx: QueryCtx, luggagePolicyId: Id<"luggagePolicies">) => {
  const policy = await ctx.db.get(luggagePolicyId);
  if (!policy) {
    throw new ConvexError("Luggage policy not found");
  }
  return policy;
};

const getRouteTemplate = async (ctx: QueryCtx, routeTemplateId: Id<"routeTemplates">) => {
  const routeTemplate = await ctx.db.get(routeTemplateId);
  if (!routeTemplate) {
    throw new ConvexError("Route template not found");
  }
  return routeTemplate;
};

const getTripStations = async (ctx: QueryCtx, tripId: Id<"trips">) => {
  const stations = await ctx.db
    .query("tripStations")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .collect();
  
  // Get station details for each trip station
  const stationDetails = await Promise.all(
    stations.map(async (station) => {
      const stationInfo = await ctx.db.get(station.stationId);
      return {
        id: station._id,
        cityName: station.cityName,
        countryCode: station.countryCode,
        stationName: stationInfo?.stationName || "",
        stationAddress: stationInfo?.stationAddress || "",
        sequenceOrder: station.sequenceOrder,
        isPickupPoint: station.isPickupPoint,
        isDropoffPoint: station.isDropoffPoint,
        estimatedTime: station.estimatedTime,
      };
    })
  );
  
  return stationDetails.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
};

const getRouteCities = async (ctx: QueryCtx, routeTemplateId: Id<"routeTemplates">) => {
  const cities = await ctx.db
    .query("routeTemplateCities")
    .withIndex("by_route_template", (q) => q.eq("routeTemplateId", routeTemplateId))
    .collect();
  
  return cities
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((city) => city.cityName);
};

const getRouteTemplatePricing = async (ctx: QueryCtx, routeTemplateId: Id<"routeTemplates">) => {
  const pricing = await ctx.db
    .query("routeTemplatePricing")
    .withIndex("by_route_template", (q) => q.eq("routeTemplateId", routeTemplateId))
    .collect();
  
  return pricing.map((p) => ({
    fromCity: p.fromCity,
    toCity: p.toCity,
    price: p.price,
  }));
};

const calculateSegmentPrice = (
  pricing: Array<{ fromCity: string; toCity: string; price: number }>,
  fromCity: string,
  toCity: string
) => {
  // Find direct pricing first
  const directPricing = pricing.find(
    (p) => p.fromCity === fromCity && p.toCity === toCity
  );
  
  if (directPricing) {
    return directPricing.price;
  }
  
  // If no direct pricing, return 0 (will need to implement segment calculation)
  return 0;
};

const getCurrentUserProfile = async (ctx: QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }
  
  // Try to get user ID using auth.getUserId first
      const userId = await getAuthUserId(ctx);
  let currentUser = null;
  
  if (userId) {
    // Try to find profile by userId first
    currentUser = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  }
  
  if (!currentUser && identity.email) {
    // Fallback: try to find profile by email
    currentUser = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
  }
  
  if (!currentUser) {
    throw new ConvexError("User profile not found. You may need to complete your profile setup or contact an administrator.");
  }
  
  return currentUser;
};

const getBookedSeatsForTrip = async (ctx: QueryCtx, tripId: Id<"trips">) => {
  const reservations = await ctx.db
    .query("reservations")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .filter((q) => q.neq(q.field("status"), "cancelled"))
    .collect();
  
  const bookedSeats: string[] = [];
  
  for (const reservation of reservations) {
    const seats = await ctx.db
      .query("bookedSeats")
      .withIndex("by_reservation", (q) => q.eq("reservationId", reservation._id))
      .collect();
    
    bookedSeats.push(...seats.map((s) => s.seatNumber));
  }
  
  return bookedSeats;
};

// =============================================
// QUERIES
// =============================================

/**
 * Search for trips based on city pair and optional filters
 */
export const searchTrips = query({
  args: {
    fromCity: v.string(),
    toCity: v.string(),
    departureDate: v.optional(v.string()),
    minSeats: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { fromCity, toCity, departureDate, minSeats = 1, maxPrice } = args;
    
    // Convert departure date to timestamp range if provided
    let startTime: number | undefined;
    let endTime: number | undefined;
    
    if (departureDate) {
      const date = new Date(departureDate);
      startTime = date.getTime();
      endTime = startTime + (24 * 60 * 60 * 1000); // Add 24 hours
    }
    
    // Get all active trips
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();
    
    const results: TripSearchResult[] = [];
    
    for (const trip of trips) {
      // Filter by departure date if specified
      if (startTime && endTime) {
        if (trip.departureTime < startTime || trip.departureTime >= endTime) {
          continue;
        }
      }
      
      // Get trip details
      const [driver, vehicle, luggagePolicy, routeTemplate] = await Promise.all([
        getDriverProfile(ctx, trip.driverId),
        getVehicleInfo(ctx, trip.vehicleId),
        getLuggagePolicy(ctx, trip.luggagePolicyId),
        getRouteTemplate(ctx, trip.routeTemplateId),
      ]);
      
      const [tripStations, routeCities, pricing] = await Promise.all([
        getTripStations(ctx, trip._id),
        getRouteCities(ctx, trip.routeTemplateId),
        getRouteTemplatePricing(ctx, trip.routeTemplateId),
      ]);
      
      // Check if the trip covers the requested route segment
      const hasFromCity = tripStations.some((s) => s.cityName === fromCity);
      const hasToCity = tripStations.some((s) => s.cityName === toCity);
      
      if (!hasFromCity || !hasToCity) {
        continue;
      }
      
      // Ensure from city comes before to city in the route
      const fromCityOrder = tripStations.find((s) => s.cityName === fromCity)?.sequenceOrder || 0;
      const toCityOrder = tripStations.find((s) => s.cityName === toCity)?.sequenceOrder || 0;
      
      if (fromCityOrder >= toCityOrder) {
        continue;
      }
      
      // Calculate available seats
      const bookedSeats = await getBookedSeatsForTrip(ctx, trip._id);
      const availableSeats = (trip.availableSeats || vehicle.capacity) - bookedSeats.length;
      
      // Filter by minimum seats
      if (availableSeats < minSeats) {
        continue;
      }
      
      // Calculate segment price
      const segmentPrice = calculateSegmentPrice(pricing, fromCity, toCity);
      
      // Filter by max price if specified
      if (maxPrice && segmentPrice > maxPrice) {
        continue;
      }
      
      // Calculate full route price (first to last city)
      const fullRoutePrice = routeCities.length > 1 
        ? calculateSegmentPrice(pricing, routeCities[0], routeCities[routeCities.length - 1])
        : segmentPrice;
      
      // Get pickup and dropoff stations
      const pickupStations = tripStations
        .filter((s) => s.cityName === fromCity && s.isPickupPoint)
        .map((s) => ({
          id: s.id,
          cityName: s.cityName,
          stationName: s.stationName,
          stationAddress: s.stationAddress,
        }));
      
      const dropoffStations = tripStations
        .filter((s) => s.cityName === toCity && s.isDropoffPoint)
        .map((s) => ({
          id: s.id,
          cityName: s.cityName,
          stationName: s.stationName,
          stationAddress: s.stationAddress,
        }));
      
      results.push({
        tripId: trip._id,
        routeTemplateId: trip.routeTemplateId,
        routeTemplateName: routeTemplate.name,
        driverId: trip.driverId,
        driverName: driver.fullName || "",
        driverRating: driver.rating || 0,
        vehicleId: trip.vehicleId,
        vehicleInfo: {
          id: vehicle._id,
          make: vehicle.make,
          model: vehicle.model,
          type: vehicle.type,
          capacity: vehicle.capacity,
          features: vehicle.features,
          seatMap: vehicle.seatMap,
        },
        departureTime: new Date(trip.departureTime).toISOString(),
        arrivalTime: trip.arrivalTime ? new Date(trip.arrivalTime).toISOString() : undefined,
        availableSeats,
        totalSeats: vehicle.capacity,
        routeCities,
        tripStations,
        segmentPrice,
        fullRoutePrice,
        pickupStations,
        dropoffStations,
        luggagePolicy: {
          id: luggagePolicy._id,
          name: luggagePolicy.name,
          freeWeightKg: luggagePolicy.freeWeightKg,
          excessFeePerKg: luggagePolicy.excessFeePerKg,
          maxBags: luggagePolicy.maxBags,
          maxBagWeightKg: luggagePolicy.freeWeightKg,
        },
      });
    }
    
    return results;
  },
});

/**
 * Get detailed trip information for booking
 */
export const getTripForBooking = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const { tripId } = args;
    
    const trip = await ctx.db.get(tripId);
    if (!trip) {
      throw new ConvexError("Trip not found");
    }
    
    const [driver, vehicle, luggagePolicy, routeTemplate] = await Promise.all([
      getDriverProfile(ctx, trip.driverId),
      getVehicleInfo(ctx, trip.vehicleId),
      getLuggagePolicy(ctx, trip.luggagePolicyId),
      getRouteTemplate(ctx, trip.routeTemplateId),
    ]);
    
    const [tripStations, routeCities, pricing] = await Promise.all([
      getTripStations(ctx, trip._id),
      getRouteCities(ctx, trip.routeTemplateId),
      getRouteTemplatePricing(ctx, trip.routeTemplateId),
    ]);
    
    const bookedSeats = await getBookedSeatsForTrip(ctx, trip._id);
    const availableSeats = (trip.availableSeats || vehicle.capacity) - bookedSeats.length;
    
    const result: TripBookingDetails = {
      tripId: trip._id,
      routeTemplateId: trip.routeTemplateId,
      routeTemplateName: routeTemplate.name,
      driverId: trip.driverId,
      driverName: driver.fullName || "",
      driverRating: driver.rating || 0,
      vehicleInfo: {
        id: vehicle._id,
        make: vehicle.make,
        model: vehicle.model,
        type: vehicle.type,
        capacity: vehicle.capacity,
        features: vehicle.features,
        seatMap: vehicle.seatMap,
      },
      departureTime: new Date(trip.departureTime).toISOString(),
      arrivalTime: trip.arrivalTime ? new Date(trip.arrivalTime).toISOString() : undefined,
      availableSeats,
      totalSeats: vehicle.capacity,
      bookedSeats,
      routeCities,
      tripStations,
      pricing,
      luggagePolicy: {
        id: luggagePolicy._id,
        name: luggagePolicy.name,
        freeWeightKg: luggagePolicy.freeWeightKg,
        excessFeePerKg: luggagePolicy.excessFeePerKg,
        maxBags: luggagePolicy.maxBags,
        maxBagSize: luggagePolicy.maxBagSize,
      },
    };
    
    return result;
  },
});

/**
 * Get trips for the current driver
 */
export const getDriverTrips = query({
  args: {
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    const { status } = args;
    
    // Get the current user profile
    const currentUser = await getCurrentUserProfile(ctx);
    
    // Check if user has driver role
    if (currentUser.role !== "driver" && currentUser.role !== "admin") {
      throw new ConvexError("Access denied. Driver access required.");
    }
    
    // Use the current user's ID as the driver ID
    const driverId = currentUser._id;
    
    let tripsQuery = ctx.db
      .query("trips")
      .withIndex("by_driver", (q) => q.eq("driverId", driverId));
    
    if (status) {
      tripsQuery = tripsQuery.filter((q) => q.eq(q.field("status"), status));
    }
    
    const trips = await tripsQuery.collect();
    
    const results = await Promise.all(
      trips.map(async (trip) => {
        const [routeTemplate, vehicle, luggagePolicy] = await Promise.all([
          getRouteTemplate(ctx, trip.routeTemplateId),
          getVehicleInfo(ctx, trip.vehicleId),
          getLuggagePolicy(ctx, trip.luggagePolicyId),
        ]);
        
        const [tripStations, routeCities] = await Promise.all([
          getTripStations(ctx, trip._id),
          getRouteCities(ctx, trip.routeTemplateId),
        ]);
        
        // Real-time calculation of booked seats
        const bookedSeats = await getBookedSeatsForTrip(ctx, trip._id);
        const availableSeats = Math.max(0, (trip.availableSeats || vehicle.capacity) - bookedSeats.length);
        
        // Real-time calculation of reservations count and earnings
        const activeReservations = await ctx.db
          .query("reservations")
          .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
          .filter((q) => q.neq(q.field("status"), "cancelled"))
          .collect();
        
        const totalEarnings = activeReservations.reduce((sum, reservation) => sum + reservation.totalPrice, 0);
        
        return {
          id: trip._id,
          routeTemplateId: trip.routeTemplateId,
          routeTemplateName: routeTemplate.name,
          departureTime: new Date(trip.departureTime).toISOString(),
          arrivalTime: trip.arrivalTime ? new Date(trip.arrivalTime).toISOString() : undefined,
          status: trip.status,
          availableSeats,
          totalSeats: vehicle.capacity,
          routeCities: routeCities.map((city, index) => ({
            id: `${trip.routeTemplateId}-${index}`,
            cityName: city,
            sequenceOrder: index,
            stations: [],
          })),
          tripStations,
          vehicleInfo: {
            id: vehicle._id,
            make: vehicle.make,
            model: vehicle.model,
            capacity: vehicle.capacity,
          },
          vehicleName: `${vehicle.make} ${vehicle.model}`,
          luggagePolicyName: luggagePolicy.name,
          reservationsCount: activeReservations.length,
          totalEarnings,
        };
      })
    );
    
    return results;
  },
});

// =============================================
// MUTATIONS
// =============================================

/**
 * Create a new trip
 */
export const createTrip = mutation({
  args: {
    routeTemplateId: v.id("routeTemplates"),
    vehicleId: v.id("vehicles"),
    luggagePolicyId: v.id("luggagePolicies"),
    departureTime: v.number(),
    arrivalTime: v.optional(v.number()),
    stationSelections: v.array(v.object({
      routeTemplateCityId: v.id("routeTemplateCities"),
      stationId: v.id("routeTemplateStations"),
      isPickupPoint: v.boolean(),
      isDropoffPoint: v.boolean(),
      estimatedTime: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    
    const currentUser = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!currentUser) {
      throw new ConvexError("User profile not found");
    }
    
    if (currentUser.role !== "driver" && currentUser.role !== "admin") {
      throw new ConvexError("Only drivers can create trips");
    }
    
    // Verify the route template belongs to the driver
    const routeTemplate = await ctx.db.get(args.routeTemplateId);
    if (!routeTemplate || routeTemplate.driverId !== currentUser._id) {
      throw new ConvexError("Route template not found or access denied");
    }
    
    // Verify the vehicle belongs to the driver
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.driverId !== currentUser._id) {
      throw new ConvexError("Vehicle not found or access denied");
    }
    
    // Verify the luggage policy belongs to the driver
    const luggagePolicy = await ctx.db.get(args.luggagePolicyId);
    if (!luggagePolicy || luggagePolicy.driverId !== currentUser._id) {
      throw new ConvexError("Luggage policy not found or access denied");
    }
    
    // Create the trip
    const tripId = await ctx.db.insert("trips", {
      routeTemplateId: args.routeTemplateId,
      driverId: currentUser._id,
      vehicleId: args.vehicleId,
      luggagePolicyId: args.luggagePolicyId,
      departureTime: args.departureTime,
      arrivalTime: args.arrivalTime,
      status: "scheduled",
      availableSeats: vehicle.capacity,
    });
    
    // Create trip stations
    for (const station of args.stationSelections) {
      // Get city information
      const city = await ctx.db.get(station.routeTemplateCityId);
      if (!city) {
        throw new ConvexError("City not found");
      }
      
      const country = await ctx.db.get(city.countryId);
      if (!country) {
        throw new ConvexError("Country not found");
      }
      
      await ctx.db.insert("tripStations", {
        tripId,
        routeTemplateCityId: station.routeTemplateCityId,
        stationId: station.stationId,
        cityName: city.cityName,
        countryId: city.countryId,
        countryCode: country.code,
        sequenceOrder: city.sequenceOrder,
        isPickupPoint: station.isPickupPoint,
        isDropoffPoint: station.isDropoffPoint,
        estimatedTime: station.estimatedTime,
      });
    }
    
    return tripId;
  },
});

/**
 * Create multiple trips in batch with recurring rules
 */
export const createBatchTrips = mutation({
  args: {
    trips: v.array(v.object({
      routeTemplateId: v.id("routeTemplates"),
      vehicleId: v.id("vehicles"),
      luggagePolicyId: v.optional(v.id("luggagePolicies")),
      departureTime: v.number(),
      arrivalTime: v.optional(v.number()),
      stationSelections: v.array(v.object({
        routeTemplateCityId: v.id("routeTemplateCities"),
        stationId: v.id("routeTemplateStations"),
        isPickupPoint: v.boolean(),
        isDropoffPoint: v.boolean(),
        estimatedTime: v.optional(v.number()),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    
    const currentUser = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!currentUser) {
      throw new ConvexError("User profile not found");
    }
    
    if (currentUser.role !== "driver" && currentUser.role !== "admin") {
      throw new ConvexError("Only drivers can create trips");
    }
    
    const createdTripIds: Id<"trips">[] = [];
    
    for (const tripData of args.trips) {
      // Verify the route template belongs to the driver
      const routeTemplate = await ctx.db.get(tripData.routeTemplateId);
      if (!routeTemplate || routeTemplate.driverId !== currentUser._id) {
        throw new ConvexError("Route template not found or access denied");
      }
      
      // Verify the vehicle belongs to the driver
      const vehicle = await ctx.db.get(tripData.vehicleId);
      if (!vehicle || vehicle.driverId !== currentUser._id) {
        throw new ConvexError("Vehicle not found or access denied");
      }
      
      // Verify the luggage policy belongs to the driver (if provided)
      if (tripData.luggagePolicyId) {
        const luggagePolicy = await ctx.db.get(tripData.luggagePolicyId);
        if (!luggagePolicy || luggagePolicy.driverId !== currentUser._id) {
          throw new ConvexError("Luggage policy not found or access denied");
        }
      }
      
      // Create the trip
      const tripId = await ctx.db.insert("trips", {
        routeTemplateId: tripData.routeTemplateId,
        driverId: currentUser._id,
        vehicleId: tripData.vehicleId,
        luggagePolicyId: tripData.luggagePolicyId!,
        departureTime: tripData.departureTime,
        arrivalTime: tripData.arrivalTime,
        status: "scheduled",
        availableSeats: vehicle.capacity,
      });
      
      // Create trip stations
      for (const station of tripData.stationSelections) {
        // Get city information
        const city = await ctx.db.get(station.routeTemplateCityId);
        if (!city) {
          throw new ConvexError("City not found");
        }
        
        const country = await ctx.db.get(city.countryId);
        if (!country) {
          throw new ConvexError("Country not found");
        }
        
        await ctx.db.insert("tripStations", {
          tripId,
          routeTemplateCityId: station.routeTemplateCityId,
          stationId: station.stationId,
          cityName: city.cityName,
          countryId: city.countryId,
          countryCode: country.code,
          sequenceOrder: city.sequenceOrder,
          isPickupPoint: station.isPickupPoint,
          isDropoffPoint: station.isDropoffPoint,
          estimatedTime: station.estimatedTime,
        });
      }
      
      createdTripIds.push(tripId);
    }
    
    return createdTripIds;
  },
});

/**
 * Update trip status
 */
export const updateTripStatus = mutation({
  args: {
    tripId: v.id("trips"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    const currentUser = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as Id<"users">))
      .first();
    
    if (!currentUser) {
      throw new ConvexError("User profile not found");
    }
    
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError("Trip not found");
    }
    
    // Only the driver or admin can update trip status
    if (trip.driverId !== currentUser._id && currentUser.role !== "admin") {
      throw new ConvexError("Access denied");
    }
    
    await ctx.db.patch(args.tripId, {
      status: args.status,
    });
    
    return { success: true };
  },
});

/**
 * Get a single trip by ID with real-time reservation updates
 */
export const getTripById = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    
    const currentUser = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!currentUser) {
      throw new ConvexError("User profile not found");
    }
    
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError("Trip not found");
    }
    
    // Only the driver or admin can view trip details
    if (trip.driverId !== currentUser._id && currentUser.role !== "admin") {
      throw new ConvexError("Access denied");
    }
    
    const [routeTemplate, vehicle, luggagePolicy] = await Promise.all([
      getRouteTemplate(ctx, trip.routeTemplateId),
      getVehicleInfo(ctx, trip.vehicleId),
      getLuggagePolicy(ctx, trip.luggagePolicyId),
    ]);
    
    const [tripStations, routeCities] = await Promise.all([
      getTripStations(ctx, trip._id),
      getRouteCities(ctx, trip.routeTemplateId),
    ]);
    
    // Real-time calculation of booked seats
    const bookedSeats = await getBookedSeatsForTrip(ctx, trip._id);
    const availableSeats = Math.max(0, (trip.availableSeats || vehicle.capacity) - bookedSeats.length);
    
    // Real-time calculation of reservations count and earnings
    const activeReservations = await ctx.db
      .query("reservations")
      .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();
    
    const totalEarnings = activeReservations.reduce((sum, reservation) => sum + reservation.totalPrice, 0);
    
    return {
      id: trip._id,
      routeTemplateId: trip.routeTemplateId,
      routeTemplateName: routeTemplate.name,
      vehicleId: trip.vehicleId,
      vehicleName: `${vehicle.make} ${vehicle.model}`,
      luggagePolicyId: trip.luggagePolicyId,
      luggagePolicyName: luggagePolicy.name,
      departureTime: new Date(trip.departureTime).toISOString(),
      arrivalTime: trip.arrivalTime ? new Date(trip.arrivalTime).toISOString() : undefined,
      totalSeats: vehicle.capacity,
      availableSeats,
      status: trip.status,
      createdAt: new Date(trip._creationTime).toISOString(),
      updatedAt: new Date(trip._creationTime).toISOString(),
      routeCities: routeCities.map((city, index) => ({
        id: `${trip.routeTemplateId}-${index}`,
        cityName: city,
        sequenceOrder: index,
        stations: [],
      })),
      tripStations: tripStations.map((station) => ({
        id: station.id,
        stationId: station.id,
        stationName: station.stationName,
        stationAddress: station.stationAddress,
        cityName: station.cityName,
        sequenceOrder: station.sequenceOrder,
        isPickupPoint: station.isPickupPoint,
        isDropoffPoint: station.isDropoffPoint,
      })),
      reservationsCount: activeReservations.length,
      totalEarnings,
    };
  },
});

/**
 * Update trip details
 */
export const updateTrip = mutation({
  args: {
    tripId: v.id("trips"),
    vehicleId: v.id("vehicles"),
    luggagePolicyId: v.id("luggagePolicies"),
    departureTime: v.number(),
    arrivalTime: v.optional(v.number()),
    stationSelections: v.array(v.object({
      routeTemplateCityId: v.id("routeTemplateCities"),
      stationId: v.id("routeTemplateStations"),
      isPickupPoint: v.boolean(),
      isDropoffPoint: v.boolean(),
      estimatedTime: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    const currentUser = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject as Id<"users">))
      .first();
    
    if (!currentUser) {
      throw new ConvexError("User profile not found");
    }
    
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError("Trip not found");
    }
    
    // Only the driver or admin can update trip
    if (trip.driverId !== currentUser._id && currentUser.role !== "admin") {
      throw new ConvexError("Access denied");
    }
    
    // Verify the vehicle belongs to the driver
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.driverId !== currentUser._id) {
      throw new ConvexError("Vehicle not found or access denied");
    }
    
    // Verify the luggage policy belongs to the driver
    const luggagePolicy = await ctx.db.get(args.luggagePolicyId);
    if (!luggagePolicy || luggagePolicy.driverId !== currentUser._id) {
      throw new ConvexError("Luggage policy not found or access denied");
    }
    
    // Update the trip
    await ctx.db.patch(args.tripId, {
      vehicleId: args.vehicleId,
      luggagePolicyId: args.luggagePolicyId,
      departureTime: args.departureTime,
      arrivalTime: args.arrivalTime,
      availableSeats: vehicle.capacity,
    });
    
    // Delete existing trip stations
    const existingStations = await ctx.db
      .query("tripStations")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    
    for (const station of existingStations) {
      await ctx.db.delete(station._id);
    }
    
    // Create new trip stations
    for (const station of args.stationSelections) {
      // Get city information
      const city = await ctx.db.get(station.routeTemplateCityId);
      if (!city) {
        throw new ConvexError("City not found");
      }
      
      const country = await ctx.db.get(city.countryId);
      if (!country) {
        throw new ConvexError("Country not found");
      }
      
      await ctx.db.insert("tripStations", {
        tripId: args.tripId,
        routeTemplateCityId: station.routeTemplateCityId,
        stationId: station.stationId,
        cityName: city.cityName,
        countryId: city.countryId,
        countryCode: country.code,
        sequenceOrder: city.sequenceOrder,
        isPickupPoint: station.isPickupPoint,
        isDropoffPoint: station.isDropoffPoint,
        estimatedTime: station.estimatedTime,
      });
    }
    
    return { success: true };
  },
});

/**
 * Delete a trip
 */
export const deleteTrip = mutation({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    
    const currentUser = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!currentUser) {
      throw new ConvexError("User profile not found");
    }
    
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError("Trip not found");
    }
    
    // Only the driver or admin can delete trip
    if (trip.driverId !== currentUser._id && currentUser.role !== "admin") {
      throw new ConvexError("Access denied");
    }
    
    // Check if there are any confirmed reservations
    const confirmedReservations = await ctx.db
      .query("reservations")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .filter((q) => q.or(
        q.eq(q.field("status"), "confirmed"),
        q.eq(q.field("status"), "pending")
      ))
      .collect();
    
    if (confirmedReservations.length > 0) {
      throw new ConvexError("Cannot delete trip with confirmed or pending reservations");
    }
    
    // Delete trip stations first
    const tripStations = await ctx.db
      .query("tripStations")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    
    for (const station of tripStations) {
      await ctx.db.delete(station._id);
    }
    
    // Delete any cancelled reservations
    const cancelledReservations = await ctx.db
      .query("reservations")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    
    for (const reservation of cancelledReservations) {
      // Delete booked seats
      const bookedSeats = await ctx.db
        .query("bookedSeats")
        .withIndex("by_reservation", (q) => q.eq("reservationId", reservation._id))
        .collect();
      
      for (const seat of bookedSeats) {
        await ctx.db.delete(seat._id);
      }
      
      // Delete reservation
      await ctx.db.delete(reservation._id);
    }
    
    // Finally delete the trip
    await ctx.db.delete(args.tripId);
    
    return { success: true };
  },
}); 