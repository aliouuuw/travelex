import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Get current authenticated user with profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      ...user,
      profile,
    };
  },
});

// Create user profile after auth signup (only for admin/first user)
export const createUserProfile = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("driver"), v.literal("passenger"))),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // This mutation is only for creating admin profiles (first user)
    // Other users go through signup requests
    if (args.role !== "admin") {
      throw new Error("This mutation is only for admin profile creation");
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      throw new Error("Profile already exists");
    }

    // Verify this is actually the first user
    const allProfiles = await ctx.db.query("profiles").collect();
    if (allProfiles.length > 0) {
      throw new Error("Admin profile already exists. Use signup requests for additional users.");
    }

    const profileId = await ctx.db.insert("profiles", {
      userId,
      fullName: args.fullName,
      email: args.email,
      phone: args.phone,
      role: "admin",
      rating: 0,
    });

    return profileId;
  },
});

// Generate upload URL for avatar images
export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// Save avatar storage ID to user profile
export const saveAvatar = mutation({
  args: { 
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get the file URL for the avatar
    const avatarUrl = await ctx.storage.getUrl(args.storageId);
    
    if (!avatarUrl) {
      throw new Error("Failed to get avatar URL");
    }

    await ctx.db.patch(profile._id, {
      avatarUrl,
    });

    return profile._id;
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      ...(args.fullName && { fullName: args.fullName }),
      ...(args.phone && { phone: args.phone }),
      ...(args.avatarUrl && { avatarUrl: args.avatarUrl }),
    });

    return profile._id;
  },
});

// Get user by email (for admin operations)
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if current user is admin
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return profile;
  },
});

// Update user role (admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("profiles"),
    role: v.union(v.literal("admin"), v.literal("driver"), v.literal("passenger")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Check if current user is admin
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
    });

    return args.userId;
  },
});

// Check if this is the first user (no profiles exist)
export const isFirstUser = query({
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles.length === 0;
  },
});

// Check if user is authenticated
export const isAuthenticated = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    return userId !== null;
  },
});

// Get user profile by ID
export const getProfileById = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    return profile;
  },
}); 

// Change password for authenticated user
export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the user's profile to get their email
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    // For now, we'll simulate password verification
    // In a real implementation, you would verify the current password
    // against the stored hash in the auth system
    
    // TODO: Implement actual password verification logic
    // This would typically involve checking the current password
    // against the stored password hash in Convex Auth
    
    // For now, we'll just validate that both passwords are provided
    if (!args.currentPassword || !args.newPassword) {
      throw new Error("Both current and new passwords are required");
    }

    // In a real implementation, you would update the password in Convex Auth
    // This might involve calling internal Convex Auth functions or APIs
    
    //console.log(`Password change requested for user ${userId}`);
    
    // Return success for now
    //return { success: true, message: "Password update successfully" };
    throw new Error("Password update failed");
  },
}); 