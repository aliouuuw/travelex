import { v } from "convex/values";
import { internalAction, mutation } from "./_generated/server";
import { format } from "date-fns";
import { internal } from "./_generated/api";

// Mutation to send booking confirmation email (callable from frontend)
export const sendBookingConfirmation = mutation({
  args: {
    bookingId: v.string(),
    email: v.string(),
    passengerName: v.string(),
    bookingReference: v.string(),
    trip: v.object({
      routeTemplateName: v.string(),
      departureTime: v.string(),
      arrivalTime: v.string(),
      driverName: v.string(),
      driverRating: v.number(),
      vehicleInfo: v.optional(v.object({
        make: v.string(),
        model: v.string(),
        year: v.number(),
      })),
    }),
    bookingDetails: v.object({
      selectedSeats: v.array(v.string()),
      numberOfBags: v.number(),
      totalPrice: v.number(),
      passengerPhone: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Schedule the email to be sent
    await ctx.scheduler.runAfter(0, internal.bookingConfirmation.sendBookingConfirmationEmail, {
      email: args.email,
      passengerName: args.passengerName,
      bookingReference: args.bookingReference,
      trip: args.trip,
      bookingDetails: args.bookingDetails,
    });

    return { success: true };
  },
});

// Internal action to send booking confirmation emails
export const sendBookingConfirmationEmail = internalAction({
  args: {
    email: v.string(),
    passengerName: v.string(),
    bookingReference: v.string(),
    trip: v.object({
      routeTemplateName: v.string(),
      departureTime: v.string(),
      arrivalTime: v.string(),
      driverName: v.string(),
      driverRating: v.number(),
      vehicleInfo: v.optional(v.object({
        make: v.string(),
        model: v.string(),
        year: v.number(),
      })),
    }),
    bookingDetails: v.object({
      selectedSeats: v.array(v.string()),
      numberOfBags: v.number(),
      totalPrice: v.number(),
      passengerPhone: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Import Resend dynamically
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const departureTime = new Date(args.trip.departureTime);
    const arrivalTime = new Date(args.trip.arrivalTime);

    try {
      const { data, error } = await resend.emails.send({
        from: "TravelEx <booking@aliou.online>",
        to: [args.email],
        subject: `Booking Confirmed - ${args.bookingReference} | TravelEx`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmation - TravelEx</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #f97316; margin: 0; font-size: 28px; font-weight: bold;">TravelEx</h1>
                  <p style="color: #64748b; margin: 10px 0 0 0; font-size: 16px;">Professional InterCity Travel</p>
                </div>

                <!-- Success Message -->
                <div style="background-color: #dcfce7; border: 1px solid #16a34a; border-radius: 6px; padding: 20px; margin-bottom: 30px; text-align: center;">
                  <div style="color: #16a34a; font-size: 48px; margin-bottom: 10px;">✓</div>
                  <h2 style="color: #16a34a; margin: 0 0 10px 0; font-size: 24px;">Booking Confirmed!</h2>
                  <p style="color: #166534; margin: 0; font-size: 18px; font-weight: 600;">
                    Reference: ${args.bookingReference}
                  </p>
                </div>

                <!-- Trip Details -->
                <div style="margin-bottom: 30px;">
                  <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
                    🗺️ Trip Details
                  </h3>
                  
                  <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">${args.trip.routeTemplateName}</h4>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                      <div style="flex: 1;">
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">DEPARTURE</p>
                        <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">
                          ${format(departureTime, "EEEE, MMMM dd, yyyy")}
                        </p>
                        <p style="color: #f97316; margin: 0; font-size: 18px; font-weight: bold;">
                          ${format(departureTime, "HH:mm")}
                        </p>
                      </div>
                      <div style="flex: 1; text-align: right;">
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">ARRIVAL</p>
                        <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">
                          ${format(arrivalTime, "EEEE, MMMM dd, yyyy")}
                        </p>
                        <p style="color: #f97316; margin: 0 0 5px 0; font-size: 18px; font-weight: bold;">
                          ${format(arrivalTime, "HH:mm")}
                        </p>
                      </div>
                    </div>

                    <!-- Driver Info -->
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 15px;">
                      <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 40px; height: 40px; background-color: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
                          ${args.trip.driverName.charAt(0)}
                        </div>
                        <div>
                          <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">${args.trip.driverName}</p>
                          <p style="color: #64748b; margin: 0; font-size: 14px;">⭐ ${args.trip.driverRating.toFixed(1)} rating • Your driver</p>
                        </div>
                      </div>
                    </div>

                    ${args.trip.vehicleInfo ? `
                    <!-- Vehicle Info -->
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 15px;">
                      <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">VEHICLE</p>
                      <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">
                        ${args.trip.vehicleInfo.make} ${args.trip.vehicleInfo.model} (${args.trip.vehicleInfo.year})
                      </p>
                    </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Passenger Details -->
                <div style="margin-bottom: 30px;">
                  <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
                    👤 Passenger Information
                  </h3>
                  
                  <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                      <div>
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">NAME</p>
                        <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">${args.passengerName}</p>
                      </div>
                      <div>
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">EMAIL</p>
                        <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">${args.email}</p>
                      </div>
                      ${args.bookingDetails.passengerPhone ? `
                      <div>
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">PHONE</p>
                        <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">${args.bookingDetails.passengerPhone}</p>
                      </div>
                      ` : ''}
                      <div>
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">SEATS</p>
                        <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">${args.bookingDetails.selectedSeats.join(', ')}</p>
                      </div>
                      <div>
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">LUGGAGE</p>
                        <p style="color: #1e293b; margin: 0; font-size: 16px; font-weight: 600;">${args.bookingDetails.numberOfBags} bag${args.bookingDetails.numberOfBags > 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">TOTAL PAID</p>
                        <p style="color: #16a34a; margin: 0; font-size: 18px; font-weight: bold;">₵${args.bookingDetails.totalPrice}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Important Information -->
                <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                  <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Important Information</h3>
                  <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                    <li>Arrive at the pickup location 15 minutes before departure time</li>
                    <li>Bring a valid ID and your booking reference: <strong>${args.bookingReference}</strong></li>
                    <li>Contact your driver if you're running late</li>
                    <li>Keep this email as your ticket - no need to print</li>
                  </ul>
                </div>

                <!-- Support Information -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                  <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Need Help?</h3>
                  <div style="display: flex; gap: 30px;">
                    <div>
                      <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">📞 PHONE</p>
                      <p style="color: #1e293b; margin: 0; font-size: 16px;">+1 (555) 123-4567</p>
                    </div>
                    <div>
                      <p style="color: #64748b; margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">📧 EMAIL</p>
                      <p style="color: #1e293b; margin: 0; font-size: 16px;">help@travelex.com</p>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  <p style="color: #64748b; margin: 0; font-size: 14px;">
                    Thank you for choosing TravelEx for your transportation needs.
                  </p>
                  <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
                    © 2025 TravelEx. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
TravelEx - Booking Confirmation

Hi ${args.passengerName},

Your booking has been confirmed!

Booking Reference: ${args.bookingReference}

Trip Details:
- Route: ${args.trip.routeTemplateName}
- Departure: ${format(departureTime, "EEEE, MMMM dd, yyyy 'at' HH:mm")}
- Arrival: ${format(arrivalTime, "EEEE, MMMM dd, yyyy 'at' HH:mm")}
- Driver: ${args.trip.driverName} (${args.trip.driverRating.toFixed(1)} rating)
${args.trip.vehicleInfo ? `- Vehicle: ${args.trip.vehicleInfo.make} ${args.trip.vehicleInfo.model} (${args.trip.vehicleInfo.year})` : ''}

Passenger Information:
- Name: ${args.passengerName}
- Email: ${args.email}
${args.bookingDetails.passengerPhone ? `- Phone: ${args.bookingDetails.passengerPhone}` : ''}
- Seats: ${args.bookingDetails.selectedSeats.join(', ')}
- Luggage: ${args.bookingDetails.numberOfBags} bag${args.bookingDetails.numberOfBags > 1 ? 's' : ''}
- Total Paid: ₵${args.bookingDetails.totalPrice}

Important Reminders:
- Arrive 15 minutes before departure
- Bring valid ID and booking reference
- Contact driver if running late
- Keep this email as your ticket

Need help? Contact us:
Phone: +1 (555) 123-4567
Email: help@travelex.com

Thank you for choosing TravelEx!
        `,
      });

      if (error) {
        console.error("Failed to send booking confirmation email:", error);
        throw new Error(`Failed to send booking confirmation email: ${error.message}`);
      }

      console.log(`Booking confirmation email sent successfully to ${args.email} (Message ID: ${data?.id})`);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending booking confirmation email:", error);
      throw error;
    }
  },
}); 