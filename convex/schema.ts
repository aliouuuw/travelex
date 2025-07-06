import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// The schema is normally optional, but Convex Auth
// requires authTables to be present in the schema.
export default defineSchema({
  ...authTables,

  // User Profiles - Extended auth users with additional fields
  profiles: defineTable({
    userId: v.id("users"), // Reference to auth users table
    fullName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("driver"), v.literal("passenger")),
    rating: v.optional(v.number()),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Countries - For geographic organization
  countries: defineTable({
    name: v.string(),
    code: v.string(), // ISO 3166-1 alpha-2
    flagEmoji: v.optional(v.string()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"]),

  // Reusable Cities - For route management efficiency  
  reusableCities: defineTable({
    driverId: v.id("profiles"),
    cityName: v.string(),
    countryId: v.id("countries"),
    countryCode: v.string(),
  })
    .index("by_driver", ["driverId"])
    .index("by_country", ["countryId"])
    .index("by_driver_and_country", ["driverId", "countryId"]),

  // Reusable Stations - Linked to cities
  reusableStations: defineTable({
    reusableCityId: v.id("reusableCities"),
    stationName: v.string(),
    stationAddress: v.string(),
  })
    .index("by_city", ["reusableCityId"]),

  // Route Templates - Define intercity connections
  routeTemplates: defineTable({
    driverId: v.id("profiles"),
    name: v.string(),
    estimatedDuration: v.string(),
    basePrice: v.number(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("inactive")),
  })
    .index("by_driver", ["driverId"])
    .index("by_status", ["status"])
    .index("by_driver_and_status", ["driverId", "status"]),

  // Cities in route templates with sequence
  routeTemplateCities: defineTable({
    routeTemplateId: v.id("routeTemplates"),
    cityName: v.string(),
    countryId: v.id("countries"),
    countryCode: v.string(),
    sequenceOrder: v.number(),
  })
    .index("by_route_template", ["routeTemplateId"])
    .index("by_sequence", ["routeTemplateId", "sequenceOrder"]),

  // Stations per city in route templates
  routeTemplateStations: defineTable({
    routeTemplateCityId: v.id("routeTemplateCities"),
    stationName: v.string(),
    stationAddress: v.string(),
  })
    .index("by_route_city", ["routeTemplateCityId"]),

  // Intercity segment pricing
  routeTemplatePricing: defineTable({
    routeTemplateId: v.id("routeTemplates"),
    fromCity: v.string(),
    toCity: v.string(),
    price: v.number(),
  })
    .index("by_route_template", ["routeTemplateId"]),

  // Vehicles - Driver fleet management
  vehicles: defineTable({
    driverId: v.id("profiles"),
    make: v.string(),
    model: v.string(),
    year: v.optional(v.number()),
    licensePlate: v.optional(v.string()),
    type: v.optional(v.string()),
    fuelType: v.optional(v.string()),
    color: v.optional(v.string()),
    capacity: v.number(),
    seatMap: v.optional(v.any()), // JSON for seat configuration
    features: v.optional(v.array(v.string())),
    status: v.union(v.literal("active"), v.literal("maintenance"), v.literal("inactive")),
    isDefault: v.optional(v.boolean()),
    insuranceExpiry: v.optional(v.string()),
    registrationExpiry: v.optional(v.string()),
    lastMaintenance: v.optional(v.string()),
    mileage: v.optional(v.number()),
    description: v.optional(v.string()),
  })
    .index("by_driver", ["driverId"])
    .index("by_status", ["status"])
    .index("by_driver_and_status", ["driverId", "status"]),

  // Luggage Policies - Bag-based pricing
  luggagePolicies: defineTable({
    driverId: v.id("profiles"),
    name: v.string(),
    description: v.optional(v.string()),
    freeWeightKg: v.number(), // Weight per bag (including free bag)
    excessFeePerKg: v.number(), // Fee per additional bag (legacy field name)
    maxBags: v.number(), // Max additional bags allowed
    maxBagSize: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  })
    .index("by_driver", ["driverId"])
    .index("by_driver_and_default", ["driverId", "isDefault"]),

  // Scheduled Trips
  trips: defineTable({
    routeTemplateId: v.id("routeTemplates"),
    driverId: v.id("profiles"),
    vehicleId: v.id("vehicles"),
    luggagePolicyId: v.id("luggagePolicies"),
    departureTime: v.number(), // Unix timestamp
    arrivalTime: v.optional(v.number()),
    status: v.union(
      v.literal("scheduled"), 
      v.literal("in-progress"), 
      v.literal("completed"), 
      v.literal("cancelled")
    ),
    availableSeats: v.optional(v.number()),
  })
    .index("by_driver", ["driverId"])
    .index("by_route_template", ["routeTemplateId"])
    .index("by_status", ["status"])
    .index("by_departure_time", ["departureTime"])
    .index("by_driver_and_date", ["driverId", "departureTime"]),

  // Selected stations for trips
  tripStations: defineTable({
    tripId: v.id("trips"),
    routeTemplateCityId: v.id("routeTemplateCities"),
    stationId: v.id("routeTemplateStations"),
    cityName: v.string(),
    countryId: v.id("countries"),
    countryCode: v.string(),
    sequenceOrder: v.number(),
    isPickupPoint: v.boolean(),
    isDropoffPoint: v.boolean(),
    estimatedTime: v.optional(v.number()),
  })
    .index("by_trip", ["tripId"])
    .index("by_sequence", ["tripId", "sequenceOrder"]),

  // Temporary Bookings (for payment processing)
  tempBookings: defineTable({
    tripId: v.string(),
    passengerName: v.string(),
    passengerEmail: v.string(),
    passengerPhone: v.string(),
    pickupStationId: v.string(),
    dropoffStationId: v.string(),
    selectedSeats: v.array(v.string()),
    numberOfBags: v.number(),
    totalPrice: v.number(),
    bookingReference: v.string(),
    paymentIntentId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"), 
      v.literal("processing"), 
      v.literal("completed"), 
      v.literal("expired")
    ),
    expiresAt: v.number(), // Unix timestamp for expiry
  })
    .index("by_trip", ["tripId"])
    .index("by_booking_reference", ["bookingReference"])
    .index("by_payment_intent", ["paymentIntentId"])
    .index("by_expires_at", ["expiresAt"])
    .index("by_status", ["status"]),

  // Passenger Reservations
  reservations: defineTable({
    tripId: v.id("trips"),
    passengerId: v.optional(v.id("profiles")), // Optional for anonymous bookings
    pickupStationId: v.id("tripStations"),
    dropoffStationId: v.id("tripStations"),
    numberOfBags: v.number(),
    totalPrice: v.number(),
    segmentPrice: v.number(),
    luggageFee: v.number(),
    passengerName: v.string(),
    passengerEmail: v.string(),
    passengerPhone: v.string(),
    bookingReference: v.string(),
    tempBookingId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"), 
      v.literal("confirmed"), 
      v.literal("completed"), 
      v.literal("cancelled")
    ),
    updatedAt: v.optional(v.number()), // Track when status was last updated
    expiresAt: v.optional(v.number()), // For anonymous booking timeout
  })
    .index("by_trip", ["tripId"])
    .index("by_passenger", ["passengerId"])
    .index("by_booking_reference", ["bookingReference"])
    .index("by_temp_booking_id", ["tempBookingId"]) // ADD THIS INDEX
    .index("by_status", ["status"])
    .index("by_expires_at", ["expiresAt"]),

  // Booked Seats
  bookedSeats: defineTable({
    reservationId: v.id("reservations"),
    seatNumber: v.string(),
  })
    .index("by_reservation", ["reservationId"]),

  // Payment Records
  payments: defineTable({
    reservationId: v.id("reservations"),
    stripePaymentId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"), 
      v.literal("succeeded"), 
      v.literal("failed"), 
      v.literal("cancelled")
    ),
    paidAt: v.optional(v.number()),
  })
    .index("by_reservation", ["reservationId"])
    .index("by_stripe_payment_id", ["stripePaymentId"]),

  // Country Expansion Requests
  countryRequests: defineTable({
    requesterId: v.id("profiles"),
    countryName: v.string(),
    countryCode: v.optional(v.string()),
    businessJustification: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reviewedBy: v.optional(v.id("profiles")),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_status", ["status"])
    .index("by_reviewer", ["reviewedBy"]),

  // Signup Requests (Driver Applications)
  signupRequests: defineTable({
    email: v.string(),
    fullName: v.string(),
    phone: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reviewedBy: v.optional(v.id("profiles")),
    reviewedAt: v.optional(v.number()),
    invitationSent: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_reviewer", ["reviewedBy"]),

  // Invitation Tokens - For driver signup invitations
  invitationTokens: defineTable({
    email: v.string(),
    token: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("driver"), v.literal("admin")),
    signupRequestId: v.optional(v.id("signupRequests")),
    createdBy: v.id("profiles"), // Admin who sent the invitation
    expiresAt: v.number(), // Unix timestamp
    usedAt: v.optional(v.number()), // When the token was used
    isUsed: v.boolean(),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_expires_at", ["expiresAt"])
    .index("by_signup_request", ["signupRequestId"]),

  // Password Reset Tokens
  passwordResetTokens: defineTable({
    email: v.string(),
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(), // Unix timestamp
    usedAt: v.optional(v.number()),
    isUsed: v.boolean(),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_user", ["userId"])
    .index("by_expires_at", ["expiresAt"]),

  // Driver Ratings
  ratings: defineTable({
    tripId: v.id("trips"),
    raterId: v.id("profiles"),
    rateeId: v.id("profiles"),
    score: v.number(), // 1-5 rating
    comment: v.optional(v.string()),
  })
    .index("by_trip", ["tripId"])
    .index("by_rater", ["raterId"])
    .index("by_ratee", ["rateeId"]),
}); 