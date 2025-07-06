import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

/**
 * Get all reusable cities and stations for the current driver
 */
export const getDriverCitiesAndStations = query({
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
    
    // Get all cities for this driver
    const cities = await ctx.db
      .query("reusableCities")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();
    
    // Get stations for each city
    const citiesWithStations = await Promise.all(
      cities.map(async (city) => {
        const stations = await ctx.db
          .query("reusableStations")
          .withIndex("by_city", (q) => q.eq("reusableCityId", city._id))
          .collect();
        
        return {
          id: city._id,
          cityName: city.cityName,
          countryCode: city.countryCode,
          stations: stations.map(station => ({
            id: station._id,
            name: station.stationName,
            address: station.stationAddress,
          })),
        };
      })
    );
    
    return citiesWithStations;
  },
});

/**
 * Get all available stations for a city (public, no authentication required)
 * This returns stations from route templates that passengers can choose from
 */
export const getPublicStationsForCity = query({
  args: { cityName: v.string() },
  handler: async (ctx, args) => {
    // Get all route template cities with the specified name
    const routeTemplateCities = await ctx.db
      .query("routeTemplateCities")
      .filter((q) => q.eq(q.field("cityName"), args.cityName))
      .collect();

    // Get all unique stations for this city from route templates
    const stationMap = new Map();
    
    for (const city of routeTemplateCities) {
      const stations = await ctx.db
        .query("routeTemplateStations")
        .withIndex("by_route_city", (q) => q.eq("routeTemplateCityId", city._id))
        .collect();
      
      // Add stations to map to avoid duplicates
      for (const station of stations) {
        const key = `${station.stationName}-${station.stationAddress}`;
        if (!stationMap.has(key)) {
          stationMap.set(key, {
            id: station._id,
            name: station.stationName,
            address: station.stationAddress,
          });
        }
      }
    }
    
    return Array.from(stationMap.values());
  },
});

/**
 * Save cities and stations (creates new or updates existing)
 */
export const saveCitiesAndStations = mutation({
  args: {
    cities: v.array(v.object({
      id: v.optional(v.id("reusableCities")),
      cityName: v.string(),
      countryCode: v.string(),
      stations: v.array(v.object({
        id: v.optional(v.id("reusableStations")),
        name: v.string(),
        address: v.string(),
      })),
    })),
  },
  handler: async (ctx, args) => {
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
    
    // Get the country for each city
    const results = [];
    
    for (const city of args.cities) {
      const country = await ctx.db
        .query("countries")
        .withIndex("by_code", (q) => q.eq("code", city.countryCode))
        .first();
      
      if (!country) {
        throw new ConvexError(`Country not found: ${city.countryCode}`);
      }
      
      let cityId = city.id;
      
      // Create or update city
      if (cityId) {
        // Update existing city
        await ctx.db.patch(cityId, {
          cityName: city.cityName,
          countryCode: city.countryCode,
          countryId: country._id,
        });
      } else {
        // Create new city
        cityId = await ctx.db.insert("reusableCities", {
          driverId: profile._id,
          cityName: city.cityName,
          countryCode: city.countryCode,
          countryId: country._id,
        });
      }
      
      // Handle stations for this city
      const existingStations = await ctx.db
        .query("reusableStations")
        .withIndex("by_city", (q) => q.eq("reusableCityId", cityId))
        .collect();
      
      // Delete stations that are no longer in the request
      const stationIdsToKeep = city.stations.filter(s => s.id).map(s => s.id!);
      for (const existingStation of existingStations) {
        if (!stationIdsToKeep.includes(existingStation._id)) {
          await ctx.db.delete(existingStation._id);
        }
      }
      
      // Create or update stations
      for (const station of city.stations) {
        if (station.id) {
          // Update existing station
          await ctx.db.patch(station.id, {
            stationName: station.name,
            stationAddress: station.address,
          });
        } else {
          // Create new station
          await ctx.db.insert("reusableStations", {
            reusableCityId: cityId,
            stationName: station.name,
            stationAddress: station.address,
          });
        }
      }
      
      results.push({ cityId, success: true });
    }
    
    return { success: true, cities: results };
  },
});

/**
 * Get stations for a specific city
 */
export const getStationsForCity = query({
  args: { cityName: v.string() },
  handler: async (ctx, args) => {
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
    
    const city = await ctx.db
      .query("reusableCities")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .filter((q) => q.eq(q.field("cityName"), args.cityName))
      .first();
    
    if (!city) {
      return [];
    }
    
    const stations = await ctx.db
      .query("reusableStations")
      .withIndex("by_city", (q) => q.eq("reusableCityId", city._id))
      .collect();
    
    return stations.map(station => ({
      id: station._id,
      name: station.stationName,
      address: station.stationAddress,
    }));
  },
});

/**
 * Add a new city with stations
 */
export const addCityWithStations = mutation({
  args: {
    cityName: v.string(),
    countryCode: v.string(),
    stations: v.array(v.object({
      name: v.string(),
      address: v.string(),
    })),
  },
  handler: async (ctx, args) => {
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
    
    const country = await ctx.db
      .query("countries")
      .withIndex("by_code", (q) => q.eq("code", args.countryCode))
      .first();
    
    if (!country) {
      throw new ConvexError(`Country not found: ${args.countryCode}`);
    }
    
    // Check if city already exists for this driver
    const existingCity = await ctx.db
      .query("reusableCities")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .filter((q) => q.eq(q.field("cityName"), args.cityName))
      .first();
    
    if (existingCity) {
      throw new ConvexError("City already exists");
    }
    
    // Create the city
    const cityId = await ctx.db.insert("reusableCities", {
      driverId: profile._id,
      cityName: args.cityName,
      countryCode: args.countryCode,
      countryId: country._id,
    });
    
    // Create stations
    for (const station of args.stations) {
      await ctx.db.insert("reusableStations", {
        reusableCityId: cityId,
        stationName: station.name,
        stationAddress: station.address,
      });
    }
    
    return { cityId, success: true };
  },
});

/**
 * Extract and save cities/stations from route template data
 */
export const extractAndSaveCitiesFromRoute = mutation({
  args: {
    cities: v.array(v.object({
      cityName: v.string(),
      countryCode: v.string(),
      stations: v.array(v.object({
        name: v.string(),
        address: v.string(),
      })),
    })),
  },
  handler: async (ctx, args) => {
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
    
    // Get existing cities
    const existingCities = await ctx.db
      .query("reusableCities")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();
    
    for (const newCity of args.cities) {
      const country = await ctx.db
        .query("countries")
        .withIndex("by_code", (q) => q.eq("code", newCity.countryCode))
        .first();
      
      if (!country) {
        continue; // Skip if country not found
      }
      
      // Check if city already exists
      const existingCity = existingCities.find(c => 
        c.cityName === newCity.cityName && c.countryCode === newCity.countryCode
      );
      
      let cityId = existingCity?._id;
      
      if (!cityId) {
        // Create new city
        cityId = await ctx.db.insert("reusableCities", {
          driverId: profile._id,
          cityName: newCity.cityName,
          countryCode: newCity.countryCode,
          countryId: country._id,
        });
      }
      
      // Merge stations
      const existingStations = await ctx.db
        .query("reusableStations")
        .withIndex("by_city", (q) => q.eq("reusableCityId", cityId))
        .collect();
      
      for (const newStation of newCity.stations) {
        const stationExists = existingStations.some(s => s.stationName === newStation.name);
        if (!stationExists) {
          await ctx.db.insert("reusableStations", {
            reusableCityId: cityId,
            stationName: newStation.name,
            stationAddress: newStation.address,
          });
        }
      }
    }
    
    return { success: true };
  },
}); 