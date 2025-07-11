import { v } from "convex/values";
import {
  action,
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
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

export interface RoundTripPaymentIntentData {
  outboundBooking: PaymentIntentData;
  returnBooking: PaymentIntentData;
  bookingGroupId: string;
  totalAmount: number;
  discountAmount: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  tempBookingId: string;
  paymentIntentId: string;
}

// Generate a secure random booking reference
function generateBookingReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let reference = "";
  for (let i = 0; i < 8; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
}

// Generate a booking group ID for round trips
function generateBookingGroupId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `GRP-${timestamp}-${random}`.toUpperCase();
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
    const tempBookingId = await ctx.runMutation(
      internal.payments.createTempBooking,
      {
        tripId: args.tripId,
        passengerName: args.passengerInfo.fullName,
        passengerEmail: args.passengerInfo.email,
        passengerPhone: args.passengerInfo.phone,
        pickupStationId: args.pickupStationId,
        dropoffStationId: args.dropoffStationId,
        selectedSeats: args.selectedSeats,
        numberOfBags: args.numberOfBags,
        totalPrice: args.totalPrice,
      },
    );

    // Create Stripe payment intent
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(args.totalPrice * 100), // Convert to cents
        currency: "CAD", // Canadian Dollars
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

      throw new ConvexError(
        `Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes from now

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

// Query to get round trip booking data
export const getRoundTripBookingData = query({
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

    // If there's no paymentIntentId, it's definitely a single booking
    if (!booking.paymentIntentId) {
      return {
        isRoundTrip: false,
        outboundBooking: booking,
        returnBooking: null,
        totalPrice: booking.totalPrice,
      };
    }

    // For round trips, find all bookings with the same paymentIntentId
    const allBookings = await ctx.db
      .query("tempBookings")
      .withIndex("by_payment_intent", (q) =>
        q.eq("paymentIntentId", booking.paymentIntentId!)
      )
      .collect();

    // Filter out expired bookings
    const validBookings = allBookings.filter(b => b.expiresAt > Date.now());

    // If there's only one booking, it's a one-way trip
    if (validBookings.length === 1) {
      return {
        isRoundTrip: false,
        outboundBooking: booking,
        returnBooking: null,
        totalPrice: booking.totalPrice,
      };
    }

    // If there are exactly 2 bookings, it's a round trip
    if (validBookings.length === 2) {
      const otherBooking = validBookings.find(b => b._id !== booking._id);
      
      return {
        isRoundTrip: true,
        outboundBooking: booking,
        returnBooking: otherBooking,
        totalPrice: validBookings.reduce((sum, b) => sum + b.totalPrice, 0),
      };
    }

    // More than 2 bookings with same payment intent shouldn't happen, fallback to single
    return {
      isRoundTrip: false,
      outboundBooking: booking,
      returnBooking: null,
      totalPrice: booking.totalPrice,
    };
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
        .withIndex("by_temp_booking_id", (q) =>
          q.eq("tempBookingId", args.tempBookingId),
        )
        .first();

      if (reservation) {
        return {
          status: "succeeded" as const,
          bookingReference: reservation.bookingReference,
          reservationId: reservation._id,
        };
      }

      return {
        status: "failed" as const,
        error: "Booking not found or expired",
      };
    }

    // Check if booking has expired
    if (tempBooking.expiresAt < Date.now()) {
      return { status: "failed" as const, error: "Booking has expired" };
    }

    // Check payment status
    if (tempBooking.paymentIntentId) {
      const payment = await ctx.db
        .query("payments")
        .withIndex("by_stripe_payment_id", (q) =>
          q.eq("stripePaymentId", tempBooking.paymentIntentId),
        )
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
  handler: async (
    ctx,
    args,
  ): Promise<{ reservationId: Id<"reservations"> }> => {
    const tempBooking = await ctx.runQuery(
      internal.payments.getTempBookingInternal,
      {
        tempBookingId: args.tempBookingId as Id<"tempBookings">,
      },
    );

    if (!tempBooking) {
      throw new ConvexError("Temporary booking not found");
    }

    // Create reservation
    const reservationId = await ctx.runMutation(
      internal.payments.createReservation,
      {
        tempBookingId: args.tempBookingId as Id<"tempBookings">,
        paymentIntentId: args.paymentIntentId,
      },
    );

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

/**
 * Create payment intent for round trip booking
 */
export const createRoundTripPaymentIntent = action({
  args: {
    outboundBooking: v.object({
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
    }),
    returnBooking: v.object({
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
    }),
    totalAmount: v.number(),
    discountAmount: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    clientSecret: string;
    bookingGroupId: string;
    paymentIntentId: string;
    outboundTempId: Id<"tempBookings">;
    returnTempId: Id<"tempBookings">;
  }> => {
    const bookingGroupId = generateBookingGroupId();

    // Create temp bookings for both trips
    const [outboundTempId, returnTempId] = await Promise.all([
      ctx.runMutation(internal.payments.createTempBookingWithGroup, {
        tripId: args.outboundBooking.tripId,
        passengerName: args.outboundBooking.passengerInfo.fullName,
        passengerEmail: args.outboundBooking.passengerInfo.email,
        passengerPhone: args.outboundBooking.passengerInfo.phone,
        pickupStationId: args.outboundBooking.pickupStationId,
        dropoffStationId: args.outboundBooking.dropoffStationId,
        selectedSeats: args.outboundBooking.selectedSeats,
        numberOfBags: args.outboundBooking.numberOfBags,
        totalPrice: args.outboundBooking.totalPrice,
        bookingGroupId,
        isRoundTrip: true,
      }),
      ctx.runMutation(internal.payments.createTempBookingWithGroup, {
        tripId: args.returnBooking.tripId,
        passengerName: args.returnBooking.passengerInfo.fullName,
        passengerEmail: args.returnBooking.passengerInfo.email,
        passengerPhone: args.returnBooking.passengerInfo.phone,
        pickupStationId: args.returnBooking.pickupStationId,
        dropoffStationId: args.returnBooking.dropoffStationId,
        selectedSeats: args.returnBooking.selectedSeats,
        numberOfBags: args.returnBooking.numberOfBags,
        totalPrice: args.returnBooking.totalPrice,
        bookingGroupId,
        isRoundTrip: true,
      }),
    ]);

    // Create Stripe payment intent for total amount
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(args.totalAmount * 100), // Convert to cents
        currency: "CAD",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingGroupId,
          outboundTempId,
          returnTempId,
          discountAmount: args.discountAmount.toString(),
          isRoundTrip: "true",
        },
      });

      // Update temp bookings with payment intent ID
      await Promise.all([
        ctx.runMutation(internal.payments.updateTempBookingPaymentIntent, {
          tempBookingId: outboundTempId,
          paymentIntentId: paymentIntent.id,
        }),
        ctx.runMutation(internal.payments.updateTempBookingPaymentIntent, {
          tempBookingId: returnTempId,
          paymentIntentId: paymentIntent.id,
        }),
      ]);

      return {
        clientSecret: paymentIntent.client_secret!,
        bookingGroupId,
        paymentIntentId: paymentIntent.id,
        outboundTempId,
        returnTempId,
      };
    } catch (error) {
      // Clean up temp bookings on error
      await Promise.all([
        ctx.runMutation(internal.payments.deleteTempBooking, {
          tempBookingId: outboundTempId,
        }),
        ctx.runMutation(internal.payments.deleteTempBooking, {
          tempBookingId: returnTempId,
        }),
      ]);

      throw new ConvexError(
        `Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

/**
 * Internal mutation to create temp booking with booking group
 */
export const createTempBookingWithGroup = internalMutation({
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
    bookingGroupId: v.string(),
    isRoundTrip: v.boolean(),
  },
  handler: async (ctx, args) => {
    const bookingReference = generateBookingReference();
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes from now

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
      status: "pending",
      expiresAt,
      isRoundTrip: args.isRoundTrip,
    });

    return tempBookingId;
  },
});

/**
 * Internal mutation to update temp booking with payment intent ID
 */
export const updateTempBookingPaymentIntent = internalMutation({
  args: {
    tempBookingId: v.id("tempBookings"),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tempBookingId, {
      paymentIntentId: args.paymentIntentId,
      status: "processing",
    });
  },
});

/**
 * Process successful round trip payment
 */
export const processRoundTripPayment = action({
  args: {
    paymentIntentId: v.string(),
    bookingGroupId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    reservationIds: Id<"reservations">[];
    bookingGroupId: string;
  }> => {
    // Get temp bookings by payment intent ID
    const tempBookings = await ctx.runQuery(
      internal.payments.getTempBookingsByPaymentIntent,
      {
        paymentIntentId: args.paymentIntentId,
      },
    );

    if (tempBookings.length !== 2) {
      throw new ConvexError("Invalid round trip booking data");
    }

    // Create reservations for both trips
    const reservationIds = await Promise.all(
      tempBookings.map(async (tempBooking) => {
        return await ctx.runMutation(
          internal.payments.createRoundTripReservation,
          {
            tempBookingId: tempBooking._id,
            paymentIntentId: args.paymentIntentId,
            bookingGroupId: args.bookingGroupId,
          },
        );
      }),
    );

    // Link the reservations
    await ctx.runMutation(internal.payments.linkRoundTripReservations, {
      reservationId1: reservationIds[0],
      reservationId2: reservationIds[1],
    });

    // Clean up temp bookings
    await Promise.all(
      tempBookings.map((tempBooking) =>
        ctx.runMutation(internal.payments.deleteTempBooking, {
          tempBookingId: tempBooking._id,
        }),
      ),
    );

    return { reservationIds, bookingGroupId: args.bookingGroupId };
  },
});

/**
 * Internal query to get temp bookings by payment intent
 */
export const getTempBookingsByPaymentIntent = internalQuery({
  args: { paymentIntentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tempBookings")
      .withIndex("by_payment_intent", (q) =>
        q.eq("paymentIntentId", args.paymentIntentId),
      )
      .collect();
  },
});

/**
 * Internal mutation to create round trip reservation
 */
export const createRoundTripReservation = internalMutation({
  args: {
    tempBookingId: v.id("tempBookings"),
    paymentIntentId: v.string(),
    bookingGroupId: v.string(),
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
      segmentPrice: tempBooking.totalPrice, // Will be calculated properly later
      luggageFee: 0, // Will be calculated properly later
      passengerName: tempBooking.passengerName,
      passengerEmail: tempBooking.passengerEmail,
      passengerPhone: tempBooking.passengerPhone,
      bookingReference: tempBooking.bookingReference,
      tempBookingId: args.tempBookingId,
      status: "confirmed",
      bookingGroupId: args.bookingGroupId,
      isRoundTrip: true,
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
      currency: "CAD",
      status: "succeeded",
      paidAt: Date.now(),
    });

    return reservationId;
  },
});

/**
 * Internal mutation to link round trip reservations
 */
export const linkRoundTripReservations = internalMutation({
  args: {
    reservationId1: v.id("reservations"),
    reservationId2: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    // Link both reservations to each other
    await ctx.db.patch(args.reservationId1, {
      linkedReservationId: args.reservationId2,
    });

    await ctx.db.patch(args.reservationId2, {
      linkedReservationId: args.reservationId1,
    });
  },
});
