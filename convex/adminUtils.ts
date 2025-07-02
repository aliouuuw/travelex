import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create an admin user directly with auth and profile (run this from Convex dashboard)
export const createDirectAdminUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    
    // Create the profile first (we'll manually link it to auth user later)
    const profileId = await ctx.db.insert("profiles", {
      userId: "temp" as Id<"users">, // We'll update this after creating auth user
      fullName: args.fullName,
      email: args.email,
      role: "admin",
      rating: 0,
    });

    return { 
      message: `Admin profile created for ${args.email}. Now sign up with these credentials in the app.`,
      profileId,
      instructions: `
1. Go to your app's /auth page
2. Sign up with:
   - Email: ${args.email}
   - Password: ${args.password}
   - Full Name: ${args.fullName}
3. The system will create the auth user and link to this profile
`
    };
  },
});

// Update existing profile to admin role
export const makeUserAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!profile) {
      return { message: "No profile found. User must sign up first." };
    }

    await ctx.db.patch(profile._id, {
      role: "admin",
    });

    return { message: `Updated ${args.email} to admin role`, profileId: profile._id };
  },
});

// Delete a signup request (for cleanup)
export const deleteSignupRequest = mutation({
  args: {
    requestId: v.id("signupRequests"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.requestId);
    return { message: "Signup request deleted" };
  },
});

// Check system status (useful for testing first user admin feature)
export const getSystemStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const admins = await ctx.db
      .query("profiles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    return {
      totalUsers: users.length,
      totalProfiles: profiles.length,
      totalAdmins: admins.length,
      isFirstUserWillBeAdmin: users.length === 0,
      message: users.length === 0 
        ? "No users yet. The next sign-up will create the first admin user." 
        : `System has ${users.length} user(s), ${admins.length} admin(s).`
    };
  },
}); 