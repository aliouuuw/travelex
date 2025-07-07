import { v } from "convex/values";
import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import Stripe from "stripe";
import type { Id } from "./_generated/dataModel";

// Types
export interface PaymentIntentData {
  tripId: string;
  passengerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  pickupStationId: string;
  dropoffStationId: string;
  selectedSeats: string[];
  numberOfBags: number;
  totalPrice: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  tempBookingId: string;
  paymentIntentId: string;
}

// Generate a secure random booking reference
function generateBookingReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let reference = '';
  for (let i = 0; i < 8; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
}

// Create a payment intent action using Stripe
export const createPaymentIntent = action({
  args: {
    tripId: v.string(),
    passengerInfo: v.object({
      fullName: v.string(),
      email: v.string(),
      phone: v.string(),
    }),
    pickupStationId: v.string(),
    dropoffStationId: v.string(),
    selectedSeats: v.array(v.string()),
    numberOfBags: v.number(),
    totalPrice: v.number(),
  },
  handler: async (ctx, args): Promise<PaymentIntentResponse> => {
    // Create temporary booking first
    const tempBookingId = await ctx.runMutation(internal.payments.createTempBooking, {
      tripId: args.tripId,
      passengerName: args.passengerInfo.fullName,
      passengerEmail: args.passengerInfo.email,
      passengerPhone: args.passengerInfo.phone,
      pickupStationId: args.pickupStationId,
      dropoffStationId: args.dropoffStationId,
      selectedSeats: args.selectedSeats,
      numberOfBags: args.numberOfBags,
      totalPrice: args.totalPrice,
    });

    // Create Stripe payment intent
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(args.totalPrice * 100), // Convert to cents
        currency: 'CAD', // Canadian Dollars
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          tempBookingId,
          tripId: args.tripId,
          passengerEmail: args.passengerInfo.email,
        },
      });

      // Update temp booking with payment intent ID
      await ctx.runMutation(internal.payments.updateTempBookingPaymentIntent, {
        tempBookingId,
        paymentIntentId: paymentIntent.id,
      });

      return {
        clientSecret: paymentIntent.client_secret || "",
        tempBookingId,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      // Clean up temp booking if payment intent creation fails
      await ctx.runMutation(internal.payments.deleteTempBooking, {
        tempBookingId,
      });
      
      throw new ConvexError(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Internal mutation to create temporary booking
export const createTempBooking = internalMutation({
  args: {
    tripId: v.string(),
    passengerName: v.string(),
    passengerEmail: v.string(),
    passengerPhone: v.string(),
    pickupStationId: v.string(),
    dropoffStationId: v.string(),
    selectedSeats: v.array(v.string()),
    numberOfBags: v.number(),
    totalPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const bookingReference = generateBookingReference();
    const expiresAt = Date.now() + (30 * 60 * 1000); // 30 minutes from now

    const tempBookingId = await ctx.db.insert("tempBookings", {
      tripId: args.tripId,
      passengerName: args.passengerName,
      passengerEmail: args.passengerEmail,
      passengerPhone: args.passengerPhone,
      pickupStationId: args.pickupStationId,
      dropoffStationId: args.dropoffStationId,
      selectedSeats: args.selectedSeats,
      numberOfBags: args.numberOfBags,
      totalPrice: args.totalPrice,
      bookingReference,
      expiresAt,
      status: "pending",
    });

    return tempBookingId;
  },
});

// Internal mutation to update temp booking with payment intent ID
export const updateTempBookingPaymentIntent = internalMutation({
  args: {
    tempBookingId: v.id("tempBookings"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tempBookingId, {
      paymentIntentId: args.paymentIntentId,
    });
  },
});

// Internal mutation to delete temp booking
export const deleteTempBooking = internalMutation({
  args: {
    tempBookingId: v.id("tempBookings"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tempBookingId);
  },
});

// Query to get temporary booking
export const getTempBooking = query({
  args: { tempBookingId: v.id("tempBookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.tempBookingId);
    
    if (!booking) {
      return null;
    }

    // Check if booking has expired
    if (booking.expiresAt < Date.now()) {
      return null;
    }

    return booking;
  },
});

// Internal query to get temporary booking (for actions)
export const getTempBookingInternal = internalQuery({
  args: { tempBookingId: v.id("tempBookings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tempBookingId);
  },
});

// Query to check payment status
export const checkPaymentStatus = query({
  args: { tempBookingId: v.id("tempBookings") },
  handler: async (ctx, args) => {
    const tempBooking = await ctx.db.get(args.tempBookingId);
    
    if (!tempBooking) {
      // If temp booking is deleted, look for reservation by temp booking ID
      const reservation = await ctx.db
        .query("reservations")
        .withIndex("by_temp_booking_id", (q) => q.eq("tempBookingId", args.tempBookingId))
        .first();
      
      if (reservation) {
        return {
          status: "succeeded" as const,
          bookingReference: reservation.bookingReference,
          reservationId: reservation._id,
        };
      }
      
      return { status: "failed" as const, error: "Booking not found or expired" };
    }

    // Check if booking has expired
    if (tempBooking.expiresAt < Date.now()) {
      return { status: "failed" as const, error: "Booking has expired" };
    }

    // Check payment status
    if (tempBooking.paymentIntentId) {
      const payment = await ctx.db
        .query("payments")
        .withIndex("by_stripe_payment_id", (q) => q.eq("stripePaymentId", tempBooking.paymentIntentId))
        .first();
      
      if (payment) {
        const reservation = await ctx.db.get(payment.reservationId);
        return {
          status: payment.status,
          bookingReference: reservation?.bookingReference,
          reservationId: payment.reservationId,
        };
      }
    }

    return { status: "pending" as const };
  },
});

// Action to process successful payment (called by webhook)
export const processSuccessfulPayment = action({
  args: {
    paymentIntentId: v.string(),
    tempBookingId: v.string(),
  },
  handler: async (ctx, args): Promise<{ reservationId: Id<"reservations"> }> => {
    const tempBooking = await ctx.runQuery(internal.payments.getTempBookingInternal, {
      tempBookingId: args.tempBookingId as Id<"tempBookings">,
    });
    
    if (!tempBooking) {
      throw new ConvexError("Temporary booking not found");
    }

    // Create reservation
    const reservationId = await ctx.runMutation(internal.payments.createReservation, {
      tempBookingId: args.tempBookingId as Id<"tempBookings">,
      paymentIntentId: args.paymentIntentId,
    });

    // Clean up temp booking
    await ctx.runMutation(internal.payments.deleteTempBooking, {
      tempBookingId: args.tempBookingId as Id<"tempBookings">,
    });

    return { reservationId };
  },
});

// Internal mutation to create reservation from temp booking
export const createReservation = internalMutation({
  args: {
    tempBookingId: v.id("tempBookings"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const tempBooking = await ctx.db.get(args.tempBookingId);
    
    if (!tempBooking) {
      throw new ConvexError("Temporary booking not found");
    }

    // Create reservation
    const reservationId = await ctx.db.insert("reservations", {
      tripId: tempBooking.tripId as Id<"trips">,
      pickupStationId: tempBooking.pickupStationId as Id<"tripStations">,
      dropoffStationId: tempBooking.dropoffStationId as Id<"tripStations">,
      numberOfBags: tempBooking.numberOfBags,
      totalPrice: tempBooking.totalPrice,
      segmentPrice: tempBooking.totalPrice, // For now, assuming same as total
      luggageFee: 0, // Calculate if needed
      passengerName: tempBooking.passengerName,
      passengerEmail: tempBooking.passengerEmail,
      passengerPhone: tempBooking.passengerPhone,
      bookingReference: tempBooking.bookingReference,
      tempBookingId: args.tempBookingId, // ADD THIS LINE - store original temp booking ID
      status: "confirmed",
    });

    // Create booked seats
    for (const seatNumber of tempBooking.selectedSeats) {
      await ctx.db.insert("bookedSeats", {
        reservationId,
        seatNumber,
      });
    }

    // Create payment record
    await ctx.db.insert("payments", {
      reservationId,
      stripePaymentId: args.paymentIntentId,
      amount: tempBooking.totalPrice,
      currency: "ghs",
      status: "succeeded",
      paidAt: Date.now(),
    });

    return reservationId;
  },
});

// Mutation to cleanup expired bookings
export const cleanupExpiredBookings = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredBookings = await ctx.db
      .query("tempBookings")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    for (const booking of expiredBookings) {
      await ctx.db.delete(booking._id);
    }

    return { deletedCount: expiredBookings.length };
  },
}); 