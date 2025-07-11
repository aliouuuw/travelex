import { v } from "convex/values";
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

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
          type: "regular" | "disabled" | "empty";
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
          type: "regular" | "disabled" | "empty";
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

const getLuggagePolicy = async (
  ctx: QueryCtx,
  luggagePolicyId: Id<"luggagePolicies">,
) => {
  const policy = await ctx.db.get(luggagePolicyId);
  if (!policy) {
    throw new ConvexError("Luggage policy not found");
  }
  return policy;
};

const getRouteTemplate = async (
  ctx: QueryCtx,
  routeTemplateId: Id<"routeTemplates">,
) => {
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
    }),
  );

  return stationDetails.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
};

const getRouteCities = async (
  ctx: QueryCtx,
  routeTemplateId: Id<"routeTemplates">,
) => {
  const cities = await ctx.db
    .query("routeTemplateCities")
    .withIndex("by_route_template", (q) =>
      q.eq("routeTemplateId", routeTemplateId),
    )
    .collect();

  return cities
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((city) => city.cityName);
};

const getRouteTemplatePricing = async (
  ctx: QueryCtx,
  routeTemplateId: Id<"routeTemplates">,
) => {
  const pricing = await ctx.db
    .query("routeTemplatePricing")
    .withIndex("by_route_template", (q) =>
      q.eq("routeTemplateId", routeTemplateId),
    )
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
  toCity: string,
  routeCities: string[],
) => {
  // Find direct pricing first
  const directPricing = pricing.find(
    (p) => p.fromCity === fromCity && p.toCity === toCity,
  );

  if (directPricing) {
    return directPricing.price;
  }

  // If no direct pricing, calculate by summing segments
  const fromIndex = routeCities.indexOf(fromCity);
  const toIndex = routeCities.indexOf(toCity);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return 0; // Should not happen with prior checks
  }

  let totalPrice = 0;
  for (let i = fromIndex; i < toIndex; i++) {
    const segmentFrom = routeCities[i];
    const segmentTo = routeCities[i + 1];
    const segmentPriceInfo = pricing.find(
      (p) => p.fromCity === segmentFrom && p.toCity === segmentTo,
    );

    if (!segmentPriceInfo) {
      // If any intermediate segment price is missing, we cannot calculate the total.
      // Depending on requirements, you might want to throw an error or handle this differently.
      return 0;
    }
    totalPrice += segmentPriceInfo.price;
  }

  return totalPrice;
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
      .withIndex("by_reservation", (q) =>
        q.eq("reservationId", reservation._id),
      )
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
export const searchTripsBySegment = query({
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
      endTime = startTime + 24 * 60 * 60 * 1000; // Add 24 hours
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
      const [driver, vehicle, luggagePolicy, routeTemplate] = await Promise.all(
        [
          getDriverProfile(ctx, trip.driverId),
          getVehicleInfo(ctx, trip.vehicleId),
          getLuggagePolicy(ctx, trip.luggagePolicyId),
          getRouteTemplate(ctx, trip.routeTemplateId),
        ],
      );

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
      const fromCityOrder =
        tripStations.find((s) => s.cityName === fromCity)?.sequenceOrder || 0;
      const toCityOrder =
        tripStations.find((s) => s.cityName === toCity)?.sequenceOrder || 0;

      if (fromCityOrder >= toCityOrder) {
        continue;
      }

      // Calculate available seats
      const bookedSeats = await getBookedSeatsForTrip(ctx, trip._id);
      const availableSeats =
        (trip.availableSeats || vehicle.capacity) - bookedSeats.length;

      // Filter by minimum seats
      if (availableSeats < minSeats) {
        continue;
      }

      // Calculate segment price
      const segmentPrice = calculateSegmentPrice(
        pricing,
        fromCity,
        toCity,
        routeCities,
      );

      // Filter by max price if specified
      if (maxPrice && segmentPrice > maxPrice) {
        continue;
      }

      // Calculate full route price (first to last city)
      const fullRoutePrice =
        routeCities.length > 1
          ? calculateSegmentPrice(
              pricing,
              routeCities[0],
              routeCities[routeCities.length - 1],
              routeCities,
            )
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
        arrivalTime: trip.arrivalTime
          ? new Date(trip.arrivalTime).toISOString()
          : undefined,
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
    const availableSeats =
      (trip.availableSeats || vehicle.capacity) - bookedSeats.length;

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
      arrivalTime: trip.arrivalTime
        ? new Date(trip.arrivalTime).toISOString()
        : undefined,
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
 * Search for trips with round trip options
 */
export const searchTripsWithRoundTrip = query({
  args: {
    fromCity: v.string(),
    toCity: v.string(),
    departureDate: v.optional(v.string()),
    returnDate: v.optional(v.string()),
    passengers: v.optional(v.number()),
    tripType: v.union(v.literal("one-way"), v.literal("round-trip")),
  },
  handler: async (ctx, args) => {
    const {
      fromCity,
      toCity,
      departureDate,
      returnDate,
      passengers = 1,
      tripType,
    } = args;

    // Convert departure date to timestamp range if provided
    let startTime: number | undefined;
    let endTime: number | undefined;

    if (departureDate) {
      const date = new Date(departureDate);
      startTime = date.getTime();
      endTime = startTime + 24 * 60 * 60 * 1000; // Add 24 hours
    }

    // Get all active trips
    let trips = await ctx.db
      .query("trips")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();

    // For round trips, only include trips that have returnTripId set
    if (tripType === "round-trip") {
      trips = trips.filter((trip) => trip.returnTripId !== undefined);
    }

    const results = [];

    for (const trip of trips) {
      // Filter by departure date if specified
      if (startTime && endTime) {
        if (trip.departureTime < startTime || trip.departureTime >= endTime) {
          continue;
        }
      }

      // Get trip details
      const [driver, vehicle, luggagePolicy, routeTemplate] = await Promise.all(
        [
          getDriverProfile(ctx, trip.driverId),
          getVehicleInfo(ctx, trip.vehicleId),
          getLuggagePolicy(ctx, trip.luggagePolicyId),
          getRouteTemplate(ctx, trip.routeTemplateId),
        ],
      );

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
      const fromCityOrder =
        tripStations.find((s) => s.cityName === fromCity)?.sequenceOrder || 0;
      const toCityOrder =
        tripStations.find((s) => s.cityName === toCity)?.sequenceOrder || 0;

      if (fromCityOrder >= toCityOrder) {
        continue;
      }

      // Calculate available seats
      const bookedSeats = await getBookedSeatsForTrip(ctx, trip._id);
      const availableSeats =
        (trip.availableSeats || vehicle.capacity) - bookedSeats.length;

      // Filter by minimum seats
      if (availableSeats < passengers) {
        continue;
      }

      // Calculate segment price
      const segmentPrice = calculateSegmentPrice(
        pricing,
        fromCity,
        toCity,
        routeCities,
      );

      // For round trips, get return trip details
      let returnTripDetails = null;
      let combinedPrice = segmentPrice;
      let discountAmount = 0;

      if (tripType === "round-trip" && trip.returnTripId) {
        const returnTrip = await ctx.db.get(trip.returnTripId);

        if (returnTrip) {
          // Check if return date matches (if provided)
          if (returnDate) {
            const returnDateStart = new Date(returnDate).getTime();
            const returnDateEnd = returnDateStart + 24 * 60 * 60 * 1000;

            if (
              returnTrip.departureTime < returnDateStart ||
              returnTrip.departureTime >= returnDateEnd
            ) {
              continue; // Skip if return date doesn't match
            }
          }

          const [returnDriver, returnVehicle, returnRouteTemplate] =
            await Promise.all([
              getDriverProfile(ctx, returnTrip.driverId),
              getVehicleInfo(ctx, returnTrip.vehicleId),
              getRouteTemplate(ctx, returnTrip.routeTemplateId),
            ]);

          const [returnTripStations, returnRouteCities, returnPricing] =
            await Promise.all([
              getTripStations(ctx, returnTrip._id),
              getRouteCities(ctx, returnTrip.routeTemplateId),
              getRouteTemplatePricing(ctx, returnTrip.routeTemplateId),
            ]);

          // Calculate return segment price (toCity to fromCity)
          const returnSegmentPrice = calculateSegmentPrice(
            returnPricing,
            toCity,
            fromCity,
            returnRouteCities,
          );

          // Calculate combined price with discount
          const subtotal = segmentPrice + returnSegmentPrice;
          const discount = trip.roundTripDiscount || 0;
          discountAmount = subtotal * discount;
          combinedPrice = subtotal - discountAmount;

          // Check available seats on return trip
          const returnBookedSeats = await getBookedSeatsForTrip(
            ctx,
            returnTrip._id,
          );
          const returnAvailableSeats =
            (returnTrip.availableSeats || returnVehicle.capacity) -
            returnBookedSeats.length;

          if (returnAvailableSeats < passengers) {
            continue; // Skip if not enough seats on return trip
          }

          // Get return trip pickup and dropoff stations
          const returnPickupStations = returnTripStations
            .filter((s) => s.cityName === toCity && s.isPickupPoint)
            .map((s) => ({
              id: s.id,
              cityName: s.cityName,
              stationName: s.stationName,
              stationAddress: s.stationAddress,
            }));

          const returnDropoffStations = returnTripStations
            .filter((s) => s.cityName === fromCity && s.isDropoffPoint)
            .map((s) => ({
              id: s.id,
              cityName: s.cityName,
              stationName: s.stationName,
              stationAddress: s.stationAddress,
            }));

          returnTripDetails = {
            tripId: returnTrip._id,
            routeTemplateName: returnRouteTemplate.name,
            driverName: returnDriver.fullName || "",
            vehicleInfo: `${returnVehicle.make} ${returnVehicle.model}`,
            departureTime: new Date(returnTrip.departureTime).toISOString(),
            arrivalTime: returnTrip.arrivalTime
              ? new Date(returnTrip.arrivalTime).toISOString()
              : undefined,
            availableSeats: returnAvailableSeats,
            price: returnSegmentPrice,
            pickupStations: returnPickupStations,
            dropoffStations: returnDropoffStations,
          };
        }
      }

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

      const result = {
        // Outbound trip details
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
        arrivalTime: trip.arrivalTime
          ? new Date(trip.arrivalTime).toISOString()
          : undefined,
        availableSeats,
        totalSeats: vehicle.capacity,
        routeCities,
        tripStations,
        segmentPrice,
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

        // Round trip specific fields
        isRoundTrip: tripType === "round-trip" && !!trip.returnTripId,
        returnTripId: trip.returnTripId,
        returnTripDetails,
        totalPrice: combinedPrice,
        discountAmount,
        discountPercentage: trip.roundTripDiscount
          ? trip.roundTripDiscount * 100
          : 0,
      };

      results.push(result);
    }

    return results;
  },
});
