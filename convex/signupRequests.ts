import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Create a new signup request
export const createSignupRequest = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if request already exists for this email
    const existing = await ctx.db
      .query("signupRequests")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("An application with this email already exists.");
    }

    const signupRequestId = await ctx.db.insert("signupRequests", {
      email: args.email,
      fullName: args.fullName,
      status: "pending",
    });

    return signupRequestId;
  },
});

// Get all signup requests (admin only)
export const getSignupRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Check if current user is admin
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const requests = await ctx.db
      .query("signupRequests")
      .order("desc")
      .collect();

    return requests;
  },
});

// Get pending signup requests (admin only)
export const getPendingSignupRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Check if current user is admin
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const requests = await ctx.db
      .query("signupRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    return requests;
  },
});

// Update signup request status (admin only)
export const updateSignupRequestStatus = mutation({
  args: {
    requestId: v.id("signupRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Check if current user is admin
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    await ctx.db.patch(args.requestId, {
      status: args.status,
      reviewedBy: currentProfile._id,
      reviewedAt: Date.now(),
    });

    return args.requestId;
  },
}); 