import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Vehicle Types
export const vehicleTypes = ["car", "van", "bus", "suv"] as const;
export const fuelTypes = ["gasoline", "diesel", "electric", "hybrid"] as const;
export const vehicleStatuses = ["active", "maintenance", "inactive"] as const;

// Get driver vehicles
export const getDriverVehicles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    // Get profile to check role
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (profile.role !== "driver") {
      throw new Error("Only drivers can access vehicles");
    }

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();

    return vehicles;
  },
});

// Get vehicle by ID
export const getVehicleById = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Check if user owns this vehicle (or is admin)
    if (vehicle.driverId !== profile._id && profile.role !== "admin") {
      throw new Error("Not authorized to access this vehicle");
    }

    return vehicle;
  },
});

// Create vehicle
export const createVehicle = mutation({
  args: {
    make: v.string(),
    model: v.string(),
    year: v.number(),
    licensePlate: v.string(),
    vehicleType: v.union(v.literal("car"), v.literal("van"), v.literal("bus"), v.literal("suv")),
    fuelType: v.union(v.literal("gasoline"), v.literal("diesel"), v.literal("electric"), v.literal("hybrid")),
    color: v.optional(v.string()),
    capacity: v.number(),
    seatMap: v.optional(v.any()),
    features: v.optional(v.array(v.string())),
    insuranceExpiry: v.optional(v.string()),
    registrationExpiry: v.optional(v.string()),
    lastMaintenance: v.optional(v.string()),
    mileage: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (profile.role !== "driver") {
      throw new Error("Only drivers can create vehicles");
    }

    // Check if this is the first vehicle - if so, make it default
    const existingVehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();

    const isFirstVehicle = existingVehicles.length === 0;

    const vehicleId = await ctx.db.insert("vehicles", {
      driverId: profile._id,
      make: args.make,
      model: args.model,
      type: args.vehicleType,
      capacity: args.capacity,
      seatMap: args.seatMap,
      features: args.features,
      status: "active",
      isDefault: isFirstVehicle,
      insuranceExpiry: args.insuranceExpiry,
      registrationExpiry: args.registrationExpiry,
      lastMaintenance: args.lastMaintenance,
      year: args.year,
      licensePlate: args.licensePlate,
      fuelType: args.fuelType,
      color: args.color,
      mileage: args.mileage,
      description: args.description,
    });

    return vehicleId;
  },
});

// Update vehicle
export const updateVehicle = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    licensePlate: v.optional(v.string()),
    vehicleType: v.optional(v.union(v.literal("car"), v.literal("van"), v.literal("bus"), v.literal("suv"))),
    fuelType: v.optional(v.union(v.literal("gasoline"), v.literal("diesel"), v.literal("electric"), v.literal("hybrid"))),
    color: v.optional(v.string()),
    capacity: v.optional(v.number()),
    seatMap: v.optional(v.any()),
    features: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("active"), v.literal("maintenance"), v.literal("inactive"))),
    insuranceExpiry: v.optional(v.string()),
    registrationExpiry: v.optional(v.string()),
    lastMaintenance: v.optional(v.string()),
    mileage: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Check if user owns this vehicle (or is admin)
    if (vehicle.driverId !== profile._id && profile.role !== "admin") {
      throw new Error("Not authorized to update this vehicle");
    }

    // Prepare update data
    const updateData: any = {};
    
    if (args.make !== undefined) updateData.make = args.make;
    if (args.model !== undefined) updateData.model = args.model;
    if (args.year !== undefined) updateData.year = args.year;
    if (args.licensePlate !== undefined) updateData.licensePlate = args.licensePlate;
    if (args.vehicleType !== undefined) updateData.type = args.vehicleType;
    if (args.fuelType !== undefined) updateData.fuelType = args.fuelType;
    if (args.color !== undefined) updateData.color = args.color;
    if (args.capacity !== undefined) updateData.capacity = args.capacity;
    if (args.seatMap !== undefined) updateData.seatMap = args.seatMap;
    if (args.features !== undefined) updateData.features = args.features;
    if (args.status !== undefined) updateData.status = args.status;
    if (args.insuranceExpiry !== undefined) updateData.insuranceExpiry = args.insuranceExpiry;
    if (args.registrationExpiry !== undefined) updateData.registrationExpiry = args.registrationExpiry;
    if (args.lastMaintenance !== undefined) updateData.lastMaintenance = args.lastMaintenance;
    if (args.mileage !== undefined) updateData.mileage = args.mileage;
    if (args.description !== undefined) updateData.description = args.description;

    await ctx.db.patch(args.vehicleId, updateData);
    
    return args.vehicleId;
  },
});

// Delete vehicle
export const deleteVehicle = mutation({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Check if user owns this vehicle (or is admin)
    if (vehicle.driverId !== profile._id && profile.role !== "admin") {
      throw new Error("Not authorized to delete this vehicle");
    }

    // Check if vehicle is being used in any active trips
    const activeTrips = await ctx.db
      .query("trips")
      .filter((q) => q.eq(q.field("vehicleId"), args.vehicleId))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    if (activeTrips.length > 0) {
      throw new Error("Cannot delete vehicle that is assigned to active trips");
    }

    await ctx.db.delete(args.vehicleId);
    
    return true;
  },
});

// Set default vehicle
export const setDefaultVehicle = mutation({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Check if user owns this vehicle
    if (vehicle.driverId !== profile._id) {
      throw new Error("Not authorized to set default for this vehicle");
    }

    // First, remove default flag from all other vehicles
    const allVehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();

    for (const v of allVehicles) {
      if (v._id !== args.vehicleId && v.isDefault) {
        await ctx.db.patch(v._id, { isDefault: false });
      }
    }

    // Set this vehicle as default
    await ctx.db.patch(args.vehicleId, { isDefault: true });
    
    return true;
  },
});

// Get vehicles for admin (can see all vehicles)
export const getAllVehicles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (profile.role !== "admin") {
      throw new Error("Only admins can access all vehicles");
    }

    const vehicles = await ctx.db.query("vehicles").collect();
    
    // Get driver info for each vehicle
    const vehiclesWithDriver = await Promise.all(
      vehicles.map(async (vehicle) => {
        const driver = await ctx.db.get(vehicle.driverId);
        return {
          ...vehicle,
          driverName: driver?.fullName || "Unknown Driver",
          driverEmail: driver?.email || "Unknown Email",
        };
      })
    );

    return vehiclesWithDriver;
  },
});

// Get vehicles by driver ID (for admin use)
export const getVehiclesByDriverId = query({
  args: { driverId: v.id("profiles") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (profile.role !== "admin") {
      throw new Error("Only admins can access vehicles by driver ID");
    }

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .collect();

    return vehicles;
  },
}); 