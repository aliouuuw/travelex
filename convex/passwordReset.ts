import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Generate a secure random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Internal action to send password reset emails
export const sendPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    fullName: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Import Resend dynamically
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const resetUrl = `${process.env.SITE_URL || 'http://localhost:5173'}/auth?mode=reset-password&token=${args.token}`;

    try {
      const { data, error } = await resend.emails.send({
        from: "TravelEx Security <no-reply@aliou.online>", // Update with your verified domain
        to: [args.email],
        subject: "Reset your TravelEx password",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - TravelEx</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #f97316; margin: 0; font-size: 28px; font-weight: bold;">TravelEx</h1>
                  <p style="color: #64748b; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
                </div>

                <!-- Main Content -->
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
                  <p style="color: #475569; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                    Hi ${args.fullName},
                  </p>
                  <p style="color: #475569; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password for your TravelEx account. If you made this request, click the button below to reset your password:
                  </p>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="display: inline-block; background-color: #f97316; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);">
                      Reset Password
                    </a>
                  </div>

                  <!-- Security Notice -->
                  <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 20px 0;">
                    <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">
                      🔒 Security Notice
                    </p>
                    <p style="color: #92400e; margin: 8px 0 0 0; font-size: 14px; line-height: 1.5;">
                      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                    </p>
                  </div>

                  <!-- Alternative Link -->
                  <p style="color: #64748b; margin: 30px 0 0 0; font-size: 14px; text-align: center;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${resetUrl}" style="color: #f97316; text-decoration: none; word-break: break-all;">${resetUrl}</a>
                  </p>
                </div>

                <!-- Footer -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                  <p style="color: #64748b; margin: 0; font-size: 14px; text-align: center;">
                    This reset link will expire in 1 hour for your security.
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
        throw new Error(`Failed to send password reset email: ${error.message}`);
      }

      console.log(`Password reset email sent successfully to ${args.email} (Message ID: ${data?.id})`);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  },
});

// Request password reset
export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!profile) {
      // Don't reveal if email exists or not for security
      return { success: true };
    }

    // Get the auth user
    const user = await ctx.db.get(profile.userId);
    if (!user) {
      return { success: true };
    }

    // Invalidate any existing unused tokens for this user
    const existingTokens = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_user", (q) => q.eq("userId", profile.userId))
      .filter((q) => q.eq(q.field("isUsed"), false))
      .collect();

    for (const token of existingTokens) {
      await ctx.db.patch(token._id, { isUsed: true });
    }

    // Generate new token
    const token = generateToken();
    const expiresAt = Date.now() + (1 * 60 * 60 * 1000); // 1 hour

    // Create password reset token
    await ctx.db.insert("passwordResetTokens", {
      email: args.email,
      token,
      userId: profile.userId,
      expiresAt,
      isUsed: false,
    });

    // Send password reset email
    await ctx.scheduler.runAfter(0, internal.passwordReset.sendPasswordResetEmail, {
      email: args.email,
      fullName: profile.fullName || 'User',
      token,
    });

    return { success: true };
  },
});

// Internal mutation for password reset (called from other files)
export const requestPasswordResetInternal = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!profile) {
      // Don't reveal if email exists or not for security
      return { success: true };
    }

    // Get the auth user
    const user = await ctx.db.get(profile.userId);
    if (!user) {
      return { success: true };
    }

    // Invalidate any existing unused tokens for this user
    const existingTokens = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_user", (q) => q.eq("userId", profile.userId))
      .filter((q) => q.eq(q.field("isUsed"), false))
      .collect();

    for (const token of existingTokens) {
      await ctx.db.patch(token._id, { isUsed: true });
    }

    // Generate new token
    const token = generateToken();
    const expiresAt = Date.now() + (1 * 60 * 60 * 1000); // 1 hour

    // Create password reset token
    await ctx.db.insert("passwordResetTokens", {
      email: args.email,
      token,
      userId: profile.userId,
      expiresAt,
      isUsed: false,
    });

    // Send password reset email
    await ctx.scheduler.runAfter(0, internal.passwordReset.sendPasswordResetEmail, {
      email: args.email,
      fullName: profile.fullName || 'User',
      token,
    });

    return { success: true };
  },
});

// Validate password reset token
export const validateResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const resetToken = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken) {
      return { valid: false, error: "Invalid reset token" };
    }

    if (resetToken.isUsed) {
      return { valid: false, error: "Reset token has already been used" };
    }

    if (resetToken.expiresAt < Date.now()) {
      return { valid: false, error: "Reset token has expired" };
    }

    // Get user profile for additional info
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", resetToken.userId))
      .first();

    return {
      valid: true,
      email: resetToken.email,
      fullName: profile?.fullName || 'User',
    };
  },
});

// Note: Custom password reset functions are no longer needed.
// Password reset is now handled by Convex Auth's built-in OTP system
// via ResendOTPPasswordReset provider in auth.ts

// Clean up expired reset tokens
export const cleanupExpiredResetTokens = mutation({
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
      .query("passwordResetTokens")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .filter((q) => q.eq(q.field("isUsed"), false))
      .collect();

    for (const token of expiredTokens) {
      await ctx.db.patch(token._id, { isUsed: true });
    }

    return expiredTokens.length;
  },
}); 