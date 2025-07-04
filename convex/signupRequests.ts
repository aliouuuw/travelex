import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

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

// Approve signup request and send invitation (admin only)
export const approveAndInvite = mutation({
  args: {
    requestId: v.id("signupRequests"),
    role: v.optional(v.union(v.literal("driver"), v.literal("admin"))),
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

    // Get the signup request
    const signupRequest = await ctx.db.get(args.requestId);
    if (!signupRequest) {
      throw new Error("Signup request not found");
    }

    if (signupRequest.status !== "pending") {
      throw new Error("Signup request has already been processed");
    }

    // Check if user already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", signupRequest.email))
      .first();

    if (existingProfile) {
      throw new Error("User with this email already exists");
    }

    // Approve the signup request
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedBy: currentProfile._id,
      reviewedAt: Date.now(),
    });

    // Create invitation token directly
    const generateToken = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };

    const token = generateToken();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    const invitationId = await ctx.db.insert("invitationTokens", {
      email: signupRequest.email,
      token,
      fullName: signupRequest.fullName,
      role: args.role || "driver",
      signupRequestId: args.requestId,
      createdBy: currentProfile._id,
      expiresAt,
      isUsed: false,
    });

    // Send invitation email
    await ctx.scheduler.runAfter(0, internal.invitations.sendInvitationEmail, {
      email: signupRequest.email,
      fullName: signupRequest.fullName,
      token,
      role: args.role || "driver",
    });

    return { signupRequestId: args.requestId, invitationId };
  },
});

// Get signup request by ID (admin only)
export const getSignupRequestById = query({
  args: { requestId: v.id("signupRequests") },
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

    const request = await ctx.db.get(args.requestId);
    return request;
  },
}); 