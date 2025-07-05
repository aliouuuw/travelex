import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a secure random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Internal action to send invitation emails
export const sendInvitationEmail = internalAction({
  args: {
    email: v.string(),
    fullName: v.string(),
    token: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Import Resend dynamically
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const invitationUrl = `${process.env.SITE_URL || 'http://localhost:5173'}/auth?mode=invitation&token=${args.token}`;

    try {
      const { data, error } = await resend.emails.send({
        from: "TravelEx <onboarding@resend.dev>", // Using Resend's default domain for testing
        to: [args.email],
        subject: `Welcome to TravelEx - You're invited to join as a ${args.role}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to TravelEx</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #f97316; margin: 0; font-size: 28px; font-weight: bold;">TravelEx</h1>
                  <p style="color: #64748b; margin: 10px 0 0 0; font-size: 16px;">Professional Travel Management</p>
                </div>

                <!-- Main Content -->
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Welcome to TravelEx, ${args.fullName}!</h2>
                  <p style="color: #475569; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                    You've been invited to join TravelEx as a <strong>${args.role}</strong>. We're excited to have you as part of our professional transportation network.
                  </p>
                  <p style="color: #475569; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                    To complete your registration and set up your account, please click the button below:
                  </p>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${invitationUrl}" 
                       style="display: inline-block; background-color: #f97316; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);">
                      Complete Registration
                    </a>
                  </div>

                  <!-- Alternative Link -->
                  <p style="color: #64748b; margin: 30px 0 0 0; font-size: 14px; text-align: center;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${invitationUrl}" style="color: #f97316; text-decoration: none; word-break: break-all;">${invitationUrl}</a>
                  </p>
                </div>

                <!-- Footer -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                  <p style="color: #64748b; margin: 0; font-size: 14px; text-align: center;">
                    This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                  <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px; text-align: center;">
                    © 2025 TravelEx. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        throw new Error(`Failed to send invitation email: ${error.message}`);
      }

      console.log(`Invitation email sent successfully to ${args.email} (Message ID: ${data?.id})`);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending invitation email:", error);
      throw error;
    }
  },
});

// Internal mutation to create invitation without auth checks (called from authenticated contexts)
export const createInvitationInternal = internalMutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("driver"), v.literal("admin")),
    signupRequestId: v.optional(v.id("signupRequests")),
    createdBy: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingProfile) {
      throw new Error("User with this email already exists");
    }

    // Invalidate any existing unused tokens for this email
    const existingTokens = await ctx.db
      .query("invitationTokens")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("isUsed"), false))
      .collect();

    for (const token of existingTokens) {
      await ctx.db.patch(token._id, { isUsed: true });
    }

    // Generate new token
    const token = generateToken();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation token
    const invitationId = await ctx.db.insert("invitationTokens", {
      email: args.email,
      token,
      fullName: args.fullName,
      role: args.role,
      signupRequestId: args.signupRequestId,
      createdBy: args.createdBy,
      expiresAt,
      isUsed: false,
    });

    // Send invitation email
    await ctx.scheduler.runAfter(0, internal.invitations.sendInvitationEmail, {
      email: args.email,
      fullName: args.fullName,
      token,
      role: args.role,
    });

    // Update signup request if provided
    if (args.signupRequestId) {
      await ctx.db.patch(args.signupRequestId, {
        invitationSent: true,
      });
    }

    return invitationId;
  },
});

// Create invitation token and send email
export const createInvitation = mutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("driver"), v.literal("admin")),
    signupRequestId: v.optional(v.id("signupRequests")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Check if current user is admin
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Inline the invitation creation logic to avoid circular dependency
    // Check if user already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingProfile) {
      throw new Error("User with this email already exists");
    }

    // Invalidate any existing unused tokens for this email
    const existingTokens = await ctx.db
      .query("invitationTokens")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("isUsed"), false))
      .collect();

    for (const token of existingTokens) {
      await ctx.db.patch(token._id, { isUsed: true });
    }

    // Generate new token
    const token = generateToken();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation token
    const invitationId = await ctx.db.insert("invitationTokens", {
      email: args.email,
      token,
      fullName: args.fullName,
      role: args.role,
      signupRequestId: args.signupRequestId,
      createdBy: currentProfile._id,
      expiresAt,
      isUsed: false,
    });

    // Send invitation email using scheduler
    await ctx.scheduler.runAfter(0, internal.invitations.sendInvitationEmail, {
      email: args.email,
      fullName: args.fullName,
      token,
      role: args.role,
    });

    // Update signup request if provided
    if (args.signupRequestId) {
      await ctx.db.patch(args.signupRequestId, {
        invitationSent: true,
      });
    }

    return invitationId;
  },
});

// Validate invitation token
export const validateInvitationToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return { valid: false, error: "Invalid invitation token" };
    }

    if (invitation.isUsed) {
      return { valid: false, error: "Invitation token has already been used" };
    }

    if (invitation.expiresAt < Date.now()) {
      return { valid: false, error: "Invitation token has expired" };
    }

    return {
      valid: true,
      invitation: {
        email: invitation.email,
        fullName: invitation.fullName,
        role: invitation.role,
      },
    };
  },
});

// Accept invitation and create user profile
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"), // Pass userId from signup
  },
  handler: async (ctx, args) => {
    // Validate token and mark as used atomically
    const invitation = await ctx.db
      .query("invitationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.isUsed) {
      throw new Error("This invitation link has already been used");
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error("This invitation link has expired");
    }

    // IMMEDIATELY mark token as used to prevent race conditions
    await ctx.db.patch(invitation._id, {
      isUsed: true,
      usedAt: Date.now(),
    });

    try {
      // Check if user already exists
      const existingProfile = await ctx.db
        .query("profiles")
        .withIndex("by_email", (q) => q.eq("email", invitation.email))
        .first();

      if (existingProfile) {
        throw new Error("A user with this email already exists");
      }

      // Check if userId already has a profile
      const existingUserProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();

      if (existingUserProfile) {
        throw new Error("This user already has a profile");
      }

      // Create the profile with invitation data
      const profileId = await ctx.db.insert("profiles", {
        userId: args.userId,
        fullName: invitation.fullName,
        email: invitation.email,
        role: invitation.role as "admin" | "driver" | "passenger",
        rating: invitation.role === "driver" ? 0 : undefined,
      });

      return {
        email: invitation.email,
        fullName: invitation.fullName,
        role: invitation.role,
        profileId,
      };
    } catch (error) {
      // If profile creation fails, we don't revert the token usage
      // This prevents the same token from being tried again
      throw error;
    }
  },
});

// Create profile from invitation after auth signup (DEPRECATED - use acceptInvitation with userId)
export const createProfileFromInvitation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find and validate the invitation token
    const invitation = await ctx.db
      .query("invitationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.isUsed) {
      throw new Error("This invitation link has already been used");
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error("This invitation link has expired");
    }

    // IMMEDIATELY mark token as used to prevent race conditions
    await ctx.db.patch(invitation._id, {
      isUsed: true,
      usedAt: Date.now(),
    });

    try {
      // Check if profile already exists
      const existingProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (existingProfile) {
        throw new Error("This user already has a profile");
      }

      // Check if email is already taken
      const existingEmailProfile = await ctx.db
        .query("profiles")
        .withIndex("by_email", (q) => q.eq("email", invitation.email))
        .first();

      if (existingEmailProfile) {
        throw new Error("A user with this email already exists");
      }

      // Create the profile with invitation data
      const profileId = await ctx.db.insert("profiles", {
        userId,
        fullName: invitation.fullName,
        email: invitation.email,
        role: invitation.role as "admin" | "driver" | "passenger",
        rating: invitation.role === "driver" ? 0 : undefined,
      });

      return profileId;
    } catch (error) {
      // If profile creation fails, we don't revert the token usage
      // This prevents the same token from being tried again
      throw error;
    }
  },
});

// Get invitation by token (for pre-filling signup form)
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation || invitation.isUsed || invitation.expiresAt < Date.now()) {
      return null;
    }

    return {
      email: invitation.email,
      fullName: invitation.fullName,
      role: invitation.role,
    };
  },
});

// Clean up expired tokens (admin function)
export const cleanupExpiredTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Check if current user is admin
    const currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    const now = Date.now();
    const expiredTokens = await ctx.db
      .query("invitationTokens")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .filter((q) => q.eq(q.field("isUsed"), false))
      .collect();

    for (const token of expiredTokens) {
      await ctx.db.patch(token._id, { isUsed: true });
    }

    return expiredTokens.length;
  },
}); 