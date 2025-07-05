import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// =============================================
// COUNTRIES CRUD OPERATIONS
// =============================================

/**
 * Get all available countries with city and trip counts
 */
export const getAvailableCountries = query({
  args: {},
  handler: async (ctx) => {
    const countries = await ctx.db.query("countries").collect();
    
    // Get city counts for each country
    const countriesWithCounts = await Promise.all(
      countries.map(async (country) => {
        const cities = await ctx.db
          .query("reusableCities")
          .withIndex("by_country", (q) => q.eq("countryId", country._id))
          .collect();
        
        // Get trip counts (via route templates)
        const routeTemplates = await ctx.db
          .query("routeTemplates")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .collect();
        
        let tripCount = 0;
        for (const template of routeTemplates) {
          const templateCities = await ctx.db
            .query("routeTemplateCities")
            .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
            .collect();
          
          const hasCountry = templateCities.some(city => city.countryId === country._id);
          if (hasCountry) {
            const trips = await ctx.db
              .query("trips")
              .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
              .collect();
            tripCount += trips.length;
          }
        }
        
        return {
          id: country._id,
          name: country.name,
          code: country.code,
          flagEmoji: country.flagEmoji,
          cityCount: cities.length,
          tripCount,
        };
      })
    );
    
    return countriesWithCounts;
  },
});

/**
 * Get all cities grouped by country
 */
export const getAvailableCitiesByCountry = query({
  args: {},
  handler: async (ctx) => {
    const countries = await ctx.db.query("countries").collect();
    const cities = await ctx.db.query("reusableCities").collect();
    
    const citiesWithCountry = await Promise.all(
      cities.map(async (city) => {
        const country = countries.find(c => c._id === city.countryId);
        if (!country) return null;
        
        // Get trip count for this city
        const routeTemplates = await ctx.db
          .query("routeTemplates")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .collect();
        
        let tripCount = 0;
        for (const template of routeTemplates) {
          const templateCities = await ctx.db
            .query("routeTemplateCities")
            .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
            .collect();
          
          const hasCity = templateCities.some(tc => tc.cityName === city.cityName && tc.countryId === country._id);
          if (hasCity) {
            const trips = await ctx.db
              .query("trips")
              .withIndex("by_route_template", (q) => q.eq("routeTemplateId", template._id))
              .collect();
            tripCount += trips.length;
          }
        }
        
        return {
          countryCode: country.code,
          countryName: country.name,
          flagEmoji: country.flagEmoji,
          cityName: city.cityName,
          tripCount,
        };
      })
    );
    
    return citiesWithCountry.filter(Boolean);
  },
});

/**
 * Get cities for a specific country
 */
export const getCitiesForCountry = query({
  args: { countryCode: v.string() },
  handler: async (ctx, args) => {
    const country = await ctx.db
      .query("countries")
      .withIndex("by_code", (q) => q.eq("code", args.countryCode))
      .first();
    
    if (!country) {
      throw new ConvexError("Country not found");
    }
    
    const cities = await ctx.db
      .query("reusableCities")
      .withIndex("by_country", (q) => q.eq("countryId", country._id))
      .collect();
    
    return cities.map(city => ({
      countryCode: country.code,
      countryName: country.name,
      flagEmoji: country.flagEmoji,
      cityName: city.cityName,
      tripCount: 0, // Will be calculated if needed
    }));
  },
});

/**
 * Create a new country
 */
export const createCountry = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    flagEmoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if country already exists
    const existingCountry = await ctx.db
      .query("countries")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    
    if (existingCountry) {
      throw new ConvexError("Country with this code already exists");
    }
    
    const countryId = await ctx.db.insert("countries", {
      name: args.name,
      code: args.code.toUpperCase(),
      flagEmoji: args.flagEmoji,
    });
    
    return countryId;
  },
});

/**
 * Update an existing country
 */
export const updateCountry = mutation({
  args: {
    id: v.id("countries"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    flagEmoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // If updating code, check for conflicts
    if (updates.code) {
      const existingCountry = await ctx.db
        .query("countries")
        .withIndex("by_code", (q) => q.eq("code", updates.code || ""))
        .first();
      
      if (existingCountry && existingCountry._id !== id) {
        throw new ConvexError("Country with this code already exists");
      }
      
      updates.code = updates.code.toUpperCase();
    }
    
    await ctx.db.patch(id, updates);
    return true;
  },
});

/**
 * Delete a country
 */
export const deleteCountry = mutation({
  args: { id: v.id("countries") },
  handler: async (ctx, args) => {
    // Check if country has associated cities
    const cities = await ctx.db
      .query("reusableCities")
      .withIndex("by_country", (q) => q.eq("countryId", args.id))
      .collect();
    
    if (cities.length > 0) {
      throw new ConvexError("Cannot delete country with associated cities");
    }
    
    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Submit a country request (for drivers)
 */
export const submitCountryRequest = mutation({
  args: {
    countryName: v.string(),
    countryCode: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
    
    // Get user profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    // Check if country already exists
    const existingCountry = await ctx.db
      .query("countries")
      .withIndex("by_code", (q) => q.eq("code", args.countryCode.toUpperCase()))
      .first();
    
    if (existingCountry) {
      throw new ConvexError("Country already exists");
    }
    
    // Check if user already has a pending request for this country
    const existingRequest = await ctx.db
      .query("countryRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", profile._id))
      .filter((q) => q.and(
        q.eq(q.field("countryCode"), args.countryCode.toUpperCase()),
        q.eq(q.field("status"), "pending")
      ))
      .first();
    
    if (existingRequest) {
      throw new ConvexError("You already have a pending request for this country");
    }
    
    const requestId = await ctx.db.insert("countryRequests", {
      requesterId: profile._id,
      countryName: args.countryName,
      countryCode: args.countryCode.toUpperCase(),
      businessJustification: args.reason,
      status: "pending",
    });
    
    return requestId;
  },
});

/**
 * Get all country requests (for admin)
 */
export const getCountryRequests = query({
  args: { status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
    
    // Check if user is admin
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!profile || profile.role !== "admin") {
      throw new ConvexError("Admin access required");
    }
    
    const requests = args.status
      ? await ctx.db.query("countryRequests")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("countryRequests").collect();
    
    // Get requester details
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db.get(request.requesterId);
        let reviewer = null;
        if (request.reviewedBy) {
          reviewer = await ctx.db.get(request.reviewedBy);
        }
        
        return {
          id: request._id,
          countryName: request.countryName,
          countryCode: request.countryCode,
          businessJustification: request.businessJustification,
          status: request.status,
          requestedBy: request.requesterId,
          requesterName: requester?.fullName || "Unknown",
          requesterEmail: requester?.email || "Unknown",
          reviewedBy: request.reviewedBy,
          reviewerName: reviewer?.fullName,
          reviewedAt: request.reviewedAt,
          createdAt: request._creationTime,
          updatedAt: request._creationTime,
        };
      })
    );
    
    return requestsWithDetails;
  },
});

/**
 * Get my country requests (for drivers)
 */
export const getMyCountryRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!profile) {
      throw new ConvexError("User profile not found");
    }
    
    const requests = await ctx.db
      .query("countryRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", profile._id))
      .collect();
    
    return requests.map(request => ({
      id: request._id,
      countryName: request.countryName,
      countryCode: request.countryCode,
      businessJustification: request.businessJustification,
      status: request.status,
      createdAt: request._creationTime,
      reviewedAt: request.reviewedAt,
    }));
  },
});

/**
 * Approve a country request (admin only)
 */
export const approveCountryRequest = mutation({
  args: {
    requestId: v.id("countryRequests"),
    flagEmoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
    
    // Check if user is admin
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!profile || profile.role !== "admin") {
      throw new ConvexError("Admin access required");
    }
    
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Country request not found");
    }
    
    if (request.status !== "pending") {
      throw new ConvexError("Request has already been processed");
    }
    
    // Create the country
    const countryId = await ctx.db.insert("countries", {
      name: request.countryName,
      code: request.countryCode!,
      flagEmoji: args.flagEmoji,
    });
    
    // Update the request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedBy: profile._id,
      reviewedAt: Date.now(),
    });
    
    return { countryId, success: true };
  },
});

/**
 * Reject a country request (admin only)
 */
export const rejectCountryRequest = mutation({
  args: {
    requestId: v.id("countryRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
    
    // Check if user is admin
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!profile || profile.role !== "admin") {
      throw new ConvexError("Admin access required");
    }
    
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Country request not found");
    }
    
    if (request.status !== "pending") {
      throw new ConvexError("Request has already been processed");
    }
    
    // Update the request status
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      reviewedBy: profile._id,
      reviewedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Verify if a city belongs to a specific country
 */
export const verifyCityCountry = query({
  args: {
    cityName: v.string(),
    countryCode: v.string(),
  },
  handler: async (ctx, args) => {
    const country = await ctx.db
      .query("countries")
      .withIndex("by_code", (q) => q.eq("code", args.countryCode.toUpperCase()))
      .first();
    
    if (!country) {
      return false;
    }
    
    const city = await ctx.db
      .query("reusableCities")
      .withIndex("by_country", (q) => q.eq("countryId", country._id))
      .filter((q) => q.eq(q.field("cityName"), args.cityName))
      .first();
    
    return !!city;
  },
}); 

/**
 * Create a global city that's available to all users
 */
export const createGlobalCity = mutation({
  args: {
    cityName: v.string(),
    countryCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
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
    
    const country = await ctx.db
      .query("countries")
      .withIndex("by_code", (q) => q.eq("code", args.countryCode.toUpperCase()))
      .first();
    
    if (!country) {
      throw new ConvexError(`Country not found: ${args.countryCode}`);
    }
    
    // Check if city already exists in this country
    const existingCity = await ctx.db
      .query("reusableCities")
      .withIndex("by_country", (q) => q.eq("countryId", country._id))
      .filter((q) => q.eq(q.field("cityName"), args.cityName))
      .first();
    
    if (existingCity) {
      throw new ConvexError("City already exists in this country");
    }
    
    // Create the city (using current user as the creator)
    const cityId = await ctx.db.insert("reusableCities", {
      driverId: profile._id,
      cityName: args.cityName,
      countryCode: args.countryCode.toUpperCase(),
      countryId: country._id,
    });
    
    return { cityId, success: true };
  },
}); 