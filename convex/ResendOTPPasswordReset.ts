"use node";

import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { alphabet, generateRandomString } from "oslo/crypto";
 
export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    return generateRandomString(6, alphabet("0-9"));
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    console.log("Attempting to send password reset email to:", email);
    
    if (!provider.apiKey) {
      console.error("No API key found in provider");
      throw new Error("Email provider not configured properly");
    }
    
    const resend = new ResendAPI(provider.apiKey);
    
    try {
      const { data, error } = await resend.emails.send({
        from: "TravelEx <no-reply@aliou.online>",
        to: [email],
        subject: `Reset your TravelEx password`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">TravelEx</h1>
            <h2>Password Reset Code</h2>
            <p>Your password reset code is:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
              ${token}
            </div>
            <p>This code will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
            <p style="color: #6b7280; font-size: 14px;">© 2025 TravelEx. All rights reserved.</p>
          </div>
        `,
        text: `Your TravelEx password reset code is: ${token}`,
      });
   
      if (error) {
        console.error("Resend API error:", error);
        throw new Error(`Failed to send email: ${error.message || error}`);
      }
      
      console.log("Password reset email sent successfully:", data?.id);
    } catch (err) {
      console.error("Error in sendVerificationRequest:", err);
      throw new Error(`Could not send password reset email: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  },
});
