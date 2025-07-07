import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Get driver luggage policies
export const getDriverLuggagePolicies = query({
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
      throw new Error("Only drivers can access luggage policies");
    }

    const policies = await ctx.db
      .query("luggagePolicies")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();

    return policies;
  },
});

// Get luggage policy by ID
export const getLuggagePolicyById = query({
  args: { policyId: v.id("luggagePolicies") },
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

    const policy = await ctx.db.get(args.policyId);
    
    if (!policy) {
      throw new Error("Luggage policy not found");
    }

    // Check if user owns this policy (or is admin)
    if (policy.driverId !== profile._id && profile.role !== "admin") {
      throw new Error("Not authorized to access this luggage policy");
    }

    return policy;
  },
});

// Create luggage policy
export const createLuggagePolicy = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    freeWeightKg: v.number(),
    excessFeePerKg: v.number(),
    maxBags: v.number(),
    maxBagSize: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
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
      throw new Error("Only drivers can create luggage policies");
    }

    // Check if this is the first policy - if so, make it default
    const existingPolicies = await ctx.db
      .query("luggagePolicies")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();

    const isFirstPolicy = existingPolicies.length === 0;

    // If setting as default, unset other defaults
    if (args.isDefault || isFirstPolicy) {
      for (const policy of existingPolicies) {
        if (policy.isDefault) {
          await ctx.db.patch(policy._id, { isDefault: false });
        }
      }
    }

    const policyId = await ctx.db.insert("luggagePolicies", {
      driverId: profile._id,
      name: args.name,
      description: args.description,
      freeWeightKg: args.freeWeightKg,
      excessFeePerKg: args.excessFeePerKg,
      maxBags: args.maxBags,
      maxBagSize: args.maxBagSize,
      isDefault: args.isDefault || isFirstPolicy,
    });

    return policyId;
  },
});

// Update luggage policy
export const updateLuggagePolicy = mutation({
  args: {
    policyId: v.id("luggagePolicies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    freeWeightKg: v.optional(v.number()),
    excessFeePerKg: v.optional(v.number()),
    maxBags: v.optional(v.number()),
    maxBagSize: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
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

    const policy = await ctx.db.get(args.policyId);
    
    if (!policy) {
      throw new Error("Luggage policy not found");
    }

    // Check if user owns this policy (or is admin)
    if (policy.driverId !== profile._id && profile.role !== "admin") {
      throw new Error("Not authorized to update this luggage policy");
    }

    // If setting as default, unset other defaults
    if (args.isDefault) {
      const otherPolicies = await ctx.db
        .query("luggagePolicies")
        .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
        .collect();

      for (const p of otherPolicies) {
        if (p._id !== args.policyId && p.isDefault) {
          await ctx.db.patch(p._id, { isDefault: false });
        }
      }
    }

    // Prepare update data
    const updateData: {
      name?: string;
      description?: string;
      freeWeightKg?: number;
      excessFeePerKg?: number;
      maxBags?: number;
      maxBagSize?: string;
      isDefault?: boolean;
    } = {};
    
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.freeWeightKg !== undefined) updateData.freeWeightKg = args.freeWeightKg;
    if (args.excessFeePerKg !== undefined) updateData.excessFeePerKg = args.excessFeePerKg;
    if (args.maxBags !== undefined) updateData.maxBags = args.maxBags;
    if (args.maxBagSize !== undefined) updateData.maxBagSize = args.maxBagSize;
    if (args.isDefault !== undefined) updateData.isDefault = args.isDefault;

    await ctx.db.patch(args.policyId, updateData);
    
    return args.policyId;
  },
});

// Delete luggage policy
export const deleteLuggagePolicy = mutation({
  args: { policyId: v.id("luggagePolicies") },
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

    const policy = await ctx.db.get(args.policyId);
    
    if (!policy) {
      throw new Error("Luggage policy not found");
    }

    // Check if user owns this policy (or is admin)
    if (policy.driverId !== profile._id && profile.role !== "admin") {
      throw new Error("Not authorized to delete this luggage policy");
    }

    // Check if policy is being used in any active trips
    const activeTrips = await ctx.db
      .query("trips")
      .filter((q) => q.eq(q.field("luggagePolicyId"), args.policyId))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    if (activeTrips.length > 0) {
      throw new Error("Cannot delete luggage policy that is assigned to active trips");
    }

    await ctx.db.delete(args.policyId);
    
    return true;
  },
});

// Set default luggage policy
export const setDefaultLuggagePolicy = mutation({
  args: { policyId: v.id("luggagePolicies") },
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

    const policy = await ctx.db.get(args.policyId);
    
    if (!policy) {
      throw new Error("Luggage policy not found");
    }

    // Check if user owns this policy
    if (policy.driverId !== profile._id) {
      throw new Error("Not authorized to set default for this luggage policy");
    }

    // First, remove default flag from all other policies
    const allPolicies = await ctx.db
      .query("luggagePolicies")
      .withIndex("by_driver", (q) => q.eq("driverId", profile._id))
      .collect();

    for (const p of allPolicies) {
      if (p._id !== args.policyId && p.isDefault) {
        await ctx.db.patch(p._id, { isDefault: false });
      }
    }

    // Set this policy as default
    await ctx.db.patch(args.policyId, { isDefault: true });
    
    return true;
  },
});

// Calculate luggage fee by number of bags
export const calculateLuggageFeeByBags = query({
  args: { 
    policyId: v.id("luggagePolicies"),
    numberOfBags: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    const policy = await ctx.db.get(args.policyId);
    
    if (!policy) {
      throw new Error("Luggage policy not found");
    }

    // Calculate fee based on number of bags
    // First bag is free, additional bags incur fee
    const additionalBags = Math.max(0, args.numberOfBags - 1);
    const maxAdditionalBags = policy.maxBags - 1; // Subtract 1 for the free bag
    
    if (additionalBags > maxAdditionalBags) {
      throw new Error(`Maximum ${policy.maxBags} bags allowed`);
    }

    const totalFee = additionalBags * policy.excessFeePerKg;
    
    return {
      totalFee,
      additionalBags,
      feePerBag: policy.excessFeePerKg,
      maxBags: policy.maxBags,
      weightPerBag: policy.freeWeightKg,
    };
  },
});

// Get all luggage policies for admin
export const getAllLuggagePolicies = query({
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
      throw new Error("Only admins can access all luggage policies");
    }

    const policies = await ctx.db.query("luggagePolicies").collect();
    
    // Get driver info for each policy
    const policiesWithDriver = await Promise.all(
      policies.map(async (policy) => {
        const driver = await ctx.db.get(policy.driverId);
        return {
          ...policy,
          driverName: driver?.fullName || "Unknown Driver",
          driverEmail: driver?.email || "Unknown Email",
        };
      })
    );

    return policiesWithDriver;
  },
});

// Get luggage policies by driver ID (for admin use)
export const getLuggagePoliciesByDriverId = query({
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
      throw new Error("Only admins can access luggage policies by driver ID");
    }

    const policies = await ctx.db
      .query("luggagePolicies")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .collect();

    return policies;
  },
}); 