import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { auth } from "./auth";

// Types for route templates
const RouteTemplateStatus = v.union(v.literal("draft"), v.literal("active"), v.literal("inactive"));

const StationSchema = v.object({
  id: v.optional(v.id("routeTemplateStations")),
  name: v.string(),
  address: v.string(),
});

const CityWithStationsSchema = v.object({
  cityName: v.string(),
  countryCode: v.optional(v.string()),
  countryName: v.optional(v.string()),
  flagEmoji: v.optional(v.string()),
  sequenceOrder: v.optional(v.number()),
  stations: v.array(StationSchema),
});

const InterCityFareSchema = v.object({
  fromCity: v.string(),
  toCity: v.string(),
  fare: v.number(),
});

/**
 * Get all route templates for a driver
 */
export const getDriverRouteTemplates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Get user ID from auth, then look up profile by userId (not email)
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("User ID not found");
    }
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    const templates = await ctx.db
      .query("routeTemplates")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();
    
    // Get additional data for each template
    const templatesWithDetails = await Promise.all(
      templates.map(async (template) => {
        // Get cities for this template
        const cities = await ctx.db
          .query("routeTemplateCities")
          .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
          .collect();
        
        // Get stations for each city
        const citiesWithStations = await Promise.all(
          cities.map(async (city) => {
            const stations = await ctx.db
              .query("routeTemplateStations")
              .withIndex("by_route_city", (q) => q.eq("routeTemplateCityId", city._id))
              .collect();
            
            return {
              cityName: city.cityName,
              countryCode: city.countryCode,
              countryName: undefined, // Will be populated if needed
              flagEmoji: undefined,
              sequenceOrder: city.sequenceOrder,
              stations: stations.map(station => ({
                id: station._id,
                name: station.stationName,
                address: station.stationAddress,
              })),
            };
          })
        );
        
        // Get intercity fares
        const intercityFares = await ctx.db
          .query("routeTemplatePricing")
          .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
          .collect();
        
        // Get trip statistics
        const trips = await ctx.db
          .query("trips")
          .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
          .collect();
        
        const scheduledTrips = trips.filter(t => t.status === "scheduled").length;
        const completedTrips = trips.filter(t => t.status === "completed").length;
        
        return {
          id: template._id,
          driverId: template.driverId,
          name: template.name,
          estimatedDuration: template.estimatedDuration,
          basePrice: template.basePrice,
          status: template.status,
          cities: citiesWithStations,
          intercityFares: intercityFares.map(fare => ({
            fromCity: fare.fromCity,
            toCity: fare.toCity,
            fare: fare.price,
          })),
          scheduledTrips,
          completedTrips,
          totalEarnings: 0, // Will be calculated if needed
          createdAt: template._creationTime,
          updatedAt: template._creationTime,
        };
      })
    );
    
    return templatesWithDetails;
  },
});

/**
 * Get a single route template by ID
 */
export const getRouteTemplateById = query({
  args: { routeTemplateId: v.id("routeTemplates") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    const template = await ctx.db.get(args.routeTemplateId);
    if (!template) {
      throw new ConvexError("Route template not found");
    }
    
    // Check ownership
    if (template.driverId !== profile._id) {
      throw new ConvexError("Access denied");
    }
    
    // Get cities for this template
    const cities = await ctx.db
      .query("routeTemplateCities")
      .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
      .collect();
    
    // Get stations for each city
    const citiesWithStations = await Promise.all(
      cities.map(async (city) => {
        const stations = await ctx.db
          .query("routeTemplateStations")
          .withIndex("by_route_city", (q) => q.eq("routeTemplateCityId", city._id))
          .collect();
        
        return {
          cityName: city.cityName,
          countryCode: city.countryCode,
          countryName: undefined,
          flagEmoji: undefined,
          sequenceOrder: city.sequenceOrder,
          stations: stations.map(station => ({
            id: station._id,
            name: station.stationName,
            address: station.stationAddress,
          })),
        };
      })
    );
    
    // Get intercity fares
    const intercityFares = await ctx.db
      .query("routeTemplatePricing")
      .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
      .collect();
    
    return {
      id: template._id,
      driverId: template.driverId,
      name: template.name,
      estimatedDuration: template.estimatedDuration,
      basePrice: template.basePrice,
      status: template.status,
      cities: citiesWithStations,
      intercityFares: intercityFares.map(fare => ({
        fromCity: fare.fromCity,
        toCity: fare.toCity,
        fare: fare.price,
      })),
      createdAt: template._creationTime,
      updatedAt: template._creationTime,
    };
  },
});

/**
 * Create a new route template
 */
export const createRouteTemplate = mutation({
  args: {
    name: v.string(),
    estimatedDuration: v.string(),
    basePrice: v.number(),
    status: RouteTemplateStatus,
    cities: v.array(CityWithStationsSchema),
    intercityFares: v.array(InterCityFareSchema),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    // Create the route template
    const templateId = await ctx.db.insert("routeTemplates", {
      driverId: profile._id,
      name: args.name,
      estimatedDuration: args.estimatedDuration,
      basePrice: args.basePrice,
      status: args.status,
    });
    
    // Create cities and stations
    for (let i = 0; i < args.cities.length; i++) {
      const city = args.cities[i];
      
      // Get country for this city
      if (!city.countryCode) {
        throw new ConvexError(`Country code is required for city: ${city.cityName}`);
      }
      
      const countryCode = city.countryCode;
      const country = await ctx.db
        .query("countries")
        .withIndex("by_code", (q) => q.eq("code", countryCode))
        .first();
      
      if (!country) {
        throw new ConvexError(`Country not found: ${city.countryCode}`);
      }
      
      // Create route template city
      const cityId = await ctx.db.insert("routeTemplateCities", {
        routeTemplateId: templateId,
        cityName: city.cityName,
        countryId: country._id,
        countryCode: city.countryCode,
        sequenceOrder: i,
      });
      
      // Create stations for this city
      for (const station of city.stations) {
        await ctx.db.insert("routeTemplateStations", {
          routeTemplateCityId: cityId,
          stationName: station.name,
          stationAddress: station.address,
        });
      }
    }
    
    // Create intercity pricing
    for (const fare of args.intercityFares) {
      await ctx.db.insert("routeTemplatePricing", {
        routeTemplateId: templateId,
        fromCity: fare.fromCity,
        toCity: fare.toCity,
        price: fare.fare,
      });
    }
    
    return templateId;
  },
});

/**
 * Update an existing route template
 */
export const updateRouteTemplate = mutation({
  args: {
    routeTemplateId: v.id("routeTemplates"),
    name: v.string(),
    estimatedDuration: v.string(),
    basePrice: v.number(),
    status: RouteTemplateStatus,
    cities: v.array(CityWithStationsSchema),
    intercityFares: v.array(InterCityFareSchema),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    const template = await ctx.db.get(args.routeTemplateId);
    if (!template) {
      throw new ConvexError("Route template not found");
    }
    
    // Check ownership
    if (template.driverId !== profile._id) {
      throw new ConvexError("Access denied");
    }
    
    // Update the route template
    await ctx.db.patch(args.routeTemplateId, {
      name: args.name,
      estimatedDuration: args.estimatedDuration,
      basePrice: args.basePrice,
      status: args.status,
    });
    
    // Delete existing cities and stations
    const existingCities = await ctx.db
      .query("routeTemplateCities")
      .withIndex("by_route_template", (q) => q.eq("routeTemplateId", args.routeTemplateId))
      .collect();
    
    for (const city of existingCities) {
      // Delete stations for this city
      const stations = await ctx.db
        .query("routeTemplateStations")
        .withIndex("by_route_city", (q) => q.eq("routeTemplateCityId", city._id))
        .collect();
      
      for (const station of stations) {
        await ctx.db.delete(station._id);
      }
      
      // Delete the city
      await ctx.db.delete(city._id);
    }
    
    // Delete existing pricing
    const existingPricing = await ctx.db
      .query("routeTemplatePricing")
      .withIndex("by_route_template", (q) => q.eq("routeTemplateId", args.routeTemplateId))
      .collect();
    
    for (const pricing of existingPricing) {
      await ctx.db.delete(pricing._id);
    }
    
    // Create new cities and stations
    for (let i = 0; i < args.cities.length; i++) {
      const city = args.cities[i];
      
      // Get country for this city
      if (!city.countryCode) {
        throw new ConvexError(`Country code is required for city: ${city.cityName}`);
      }
      
      const countryCode = city.countryCode;
      const country = await ctx.db
        .query("countries")
        .withIndex("by_code", (q) => q.eq("code", countryCode))
        .first();
      
      if (!country) {
        throw new ConvexError(`Country not found: ${city.countryCode}`);
      }
      
      // Create route template city
      const cityId = await ctx.db.insert("routeTemplateCities", {
        routeTemplateId: args.routeTemplateId,
        cityName: city.cityName,
        countryId: country._id,
        countryCode: city.countryCode,
        sequenceOrder: i,
      });
      
      // Create stations for this city
      for (const station of city.stations) {
        await ctx.db.insert("routeTemplateStations", {
          routeTemplateCityId: cityId,
          stationName: station.name,
          stationAddress: station.address,
        });
      }
    }
    
    // Create new intercity pricing
    for (const fare of args.intercityFares) {
      await ctx.db.insert("routeTemplatePricing", {
        routeTemplateId: args.routeTemplateId,
        fromCity: fare.fromCity,
        toCity: fare.toCity,
        price: fare.fare,
      });
    }
    
    return { success: true };
  },
});

/**
 * Delete a route template
 */
export const deleteRouteTemplate = mutation({
  args: { routeTemplateId: v.id("routeTemplates") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    const template = await ctx.db.get(args.routeTemplateId);
    if (!template) {
      throw new ConvexError("Route template not found");
    }
    
    // Check ownership
    if (template.driverId !== profile._id) {
      throw new ConvexError("Access denied");
    }
    
    // Check if template has scheduled trips
    const scheduledTrips = await ctx.db
      .query("trips")
      .withIndex("by_route_template", (q) => q.eq("routeTemplateId", args.routeTemplateId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();
    
    if (scheduledTrips.length > 0) {
      throw new ConvexError("Cannot delete route template with scheduled trips");
    }
    
    // Delete cities and stations
    const cities = await ctx.db
      .query("routeTemplateCities")
      .withIndex("by_route_template", (q) => q.eq("routeTemplateId", args.routeTemplateId))
      .collect();
    
    for (const city of cities) {
      // Delete stations for this city
      const stations = await ctx.db
        .query("routeTemplateStations")
        .withIndex("by_route_city", (q) => q.eq("routeTemplateCityId", city._id))
        .collect();
      
      for (const station of stations) {
        await ctx.db.delete(station._id);
      }
      
      // Delete the city
      await ctx.db.delete(city._id);
    }
    
    // Delete pricing
    const pricing = await ctx.db
      .query("routeTemplatePricing")
      .withIndex("by_route_template", (q) => q.eq("routeTemplateId", args.routeTemplateId))
      .collect();
    
    for (const p of pricing) {
      await ctx.db.delete(p._id);
    }
    
    // Delete the template
    await ctx.db.delete(args.routeTemplateId);
    
    return { success: true };
  },
});

/**
 * Toggle route template status
 */
export const toggleRouteTemplateStatus = mutation({
  args: {
    routeTemplateId: v.id("routeTemplates"),
    newStatus: RouteTemplateStatus,
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    const template = await ctx.db.get(args.routeTemplateId);
    if (!template) {
      throw new ConvexError("Route template not found");
    }
    
    // Check ownership
    if (template.driverId !== profile._id) {
      throw new ConvexError("Access denied");
    }
    
    await ctx.db.patch(args.routeTemplateId, {
      status: args.newStatus,
    });
    
    return { success: true };
  },
});

/**
 * Validate route countries and ensure they exist
 */
export const validateRouteCountries = query({
  args: { routeTemplateId: v.id("routeTemplates") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    const template = await ctx.db.get(args.routeTemplateId);
    if (!template) {
      throw new ConvexError("Route template not found");
    }
    
    // Check ownership
    if (template.driverId !== profile._id) {
      throw new ConvexError("Access denied");
    }
    
    // Get cities for this template
    const cities = await ctx.db
      .query("routeTemplateCities")
      .withIndex("by_route_template", (q) => q.eq("routeTemplateId", args.routeTemplateId))
      .collect();
    
    const validations = await Promise.all(
      cities.map(async (city) => {
        const country = await ctx.db.get(city.countryId);
        
        return {
          cityName: city.cityName,
          countryCode: city.countryCode,
          countryName: country?.name || "Unknown",
          isValid: !!country,
          validationMessage: country ? "Valid" : "Country not found",
        };
      })
    );
    
    return validations;
  },
}); 