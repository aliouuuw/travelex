# Round Trip Booking - Database Technical Design

*Technical specification for database schema changes to support round trip bookings*

## 📊 Current Database State

### Trips Table (Current)
```typescript
trips: defineTable({
  id: v.id("trips"),
  routeTemplateId: v.id("routeTemplates"),
  driverId: v.id("profiles"),
  vehicleId: v.id("vehicles"),
  luggagePolicyId: v.id("luggagePolicies"),
  departureTime: v.number(),
  arrivalTime: v.optional(v.number()),
  status: v.union(
    v.literal("scheduled"), 
    v.literal("in-progress"), 
    v.literal("completed"), 
    v.literal("cancelled")
  ),
  availableSeats: v.optional(v.number()),
})
```

### Reservations Table (Current)
```typescript
reservations: defineTable({
  id: v.id("reservations"),
  tripId: v.id("trips"),
  passengerId: v.optional(v.id("profiles")),
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
  updatedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
})
```

## 🔄 Proposed Schema Changes

### Enhanced Trips Table
```typescript
trips: defineTable({
  // ... existing fields ...
  
  // Round trip linking fields
  returnTripId: v.optional(v.id("trips")),      // Forward reference to return trip
  outboundTripId: v.optional(v.id("trips")),    // Backward reference from return trip
  
  // Pricing configuration
  roundTripDiscount: v.optional(v.number()),    // Decimal 0-1 (e.g., 0.1 = 10%)
  
  // Metadata
  isReturnEnabled: v.optional(v.boolean()),     // Can this trip be part of round trip
  linkedAt: v.optional(v.number()),             // Timestamp when trips were linked
  linkedBy: v.optional(v.id("profiles")),       // Driver who created the link
})
  // Existing indexes...
  .index("by_return_trip", ["returnTripId"])
  .index("by_outbound_trip", ["outboundTripId"])
  .index("by_driver_and_return", ["driverId", "isReturnEnabled"])
```

### Enhanced Reservations Table
```typescript
reservations: defineTable({
  // ... existing fields ...
  
  // Round trip grouping
  bookingGroupId: v.optional(v.string()),           // UUID to group round trip bookings
  linkedReservationId: v.optional(v.id("reservations")), // Direct link to paired reservation
  
  // Trip type metadata
  isRoundTrip: v.optional(v.boolean()),             // Part of round trip booking
  tripDirection: v.optional(v.union(                // Which leg of round trip
    v.literal("outbound"),
    v.literal("return")
  )),
  
  // Pricing breakdown
  originalPrice: v.optional(v.number()),            // Price before round trip discount
  discountAmount: v.optional(v.number()),           // Amount saved on this leg
  discountPercentage: v.optional(v.number()),       // Discount percentage applied
})
  // Existing indexes...
  .index("by_booking_group", ["bookingGroupId"])
  .index("by_linked_reservation", ["linkedReservationId"])
```

### New Booking Groups Table (Optional)
```typescript
bookingGroups: defineTable({
  id: v.id("bookingGroups"),
  groupId: v.string(),                              // UUID for the group
  createdAt: v.number(),
  
  // Trip references
  outboundTripId: v.id("trips"),
  returnTripId: v.id("trips"),
  
  // Reservation references (after payment)
  outboundReservationId: v.optional(v.id("reservations")),
  returnReservationId: v.optional(v.id("reservations")),
  
  // Pricing summary
  totalPrice: v.number(),
  outboundPrice: v.number(),
  returnPrice: v.number(),
  discountAmount: v.number(),
  
  // Status tracking
  status: v.union(
    v.literal("pending"),                          // During booking
    v.literal("confirmed"),                        // After payment
    v.literal("partially_cancelled"),              // One leg cancelled
    v.literal("cancelled")                         // Both cancelled
  ),
})
  .index("by_group_id", ["groupId"])
  .index("by_outbound_trip", ["outboundTripId"])
  .index("by_return_trip", ["returnTripId"])
```

## 🔗 Data Relationships

### Trip Linking Rules
1. **Bidirectional References**
   - Outbound trip has `returnTripId` pointing to return trip
   - Return trip has `outboundTripId` pointing back to outbound
   - Both references must be consistent

2. **Validation Constraints**
   - Same driver (`trip1.driverId === trip2.driverId`)
   - Reversed route (origin/destination swapped)
   - Return departure > outbound arrival
   - No circular references
   - No existing round trip bookings when unlinking

3. **Cascade Rules**
   - Cancelling linked trip affects link status
   - Deleting trip removes link from paired trip
   - Status changes may affect linked trip

### Reservation Grouping
1. **Booking Group Creation**
   - Generated when round trip booking starts
   - Links both temp bookings during payment
   - Converts to permanent reservations on success

2. **Atomic Operations**
   - Both reservations created in single transaction
   - Both succeed or both fail
   - Seat availability checked for both before confirming

## 📝 Query Patterns

### Driver Queries
```typescript
// Get trips with return options
const getTripsWithReturnStatus = (driverId: Id<"profiles">) => {
  return ctx.db
    .query("trips")
    .withIndex("by_driver", q => q.eq("driverId", driverId))
    .filter(q => q.eq(q.field("status"), "scheduled"))
    .collect()
    .then(trips => trips.map(trip => ({
      ...trip,
      hasReturn: !!trip.returnTripId,
      returnTrip: trip.returnTripId ? getTrip(trip.returnTripId) : null
    })));
};

// Get eligible return trips for linking
const getEligibleReturnTrips = (outboundTrip: Trip) => {
  return ctx.db
    .query("trips")
    .withIndex("by_driver", q => q.eq("driverId", outboundTrip.driverId))
    .filter(q => 
      q.and(
        q.eq(q.field("status"), "scheduled"),
        q.gt(q.field("departureTime"), outboundTrip.arrivalTime),
        q.eq(q.field("returnTripId"), undefined)
      )
    )
    .collect()
    .then(trips => trips.filter(trip => 
      isReturnRoute(outboundTrip, trip)
    ));
};
```

### Passenger Queries
```typescript
// Search for round trips
const searchRoundTrips = (params: SearchParams) => {
  return ctx.db
    .query("trips")
    .filter(q => 
      q.and(
        // Regular search filters...
        q.neq(q.field("returnTripId"), undefined)
      )
    )
    .collect()
    .then(trips => trips.map(trip => ({
      outbound: trip,
      return: getTrip(trip.returnTripId),
      combinedPrice: calculateRoundTripPrice(trip)
    })));
};

// Get round trip reservations
const getRoundTripReservations = (bookingGroupId: string) => {
  return ctx.db
    .query("reservations")
    .withIndex("by_booking_group", q => q.eq("bookingGroupId", bookingGroupId))
    .collect();
};
```

## 🚀 Migration Strategy

### Phase 1: Schema Addition
```sql
-- No breaking changes, only additions
ALTER TABLE trips ADD COLUMN returnTripId TEXT;
ALTER TABLE trips ADD COLUMN outboundTripId TEXT;
ALTER TABLE trips ADD COLUMN roundTripDiscount DECIMAL(3,2);

ALTER TABLE reservations ADD COLUMN bookingGroupId TEXT;
ALTER TABLE reservations ADD COLUMN linkedReservationId TEXT;
ALTER TABLE reservations ADD COLUMN isRoundTrip BOOLEAN DEFAULT FALSE;
```

### Phase 2: Index Creation
```sql
CREATE INDEX idx_trips_return ON trips(returnTripId);
CREATE INDEX idx_trips_outbound ON trips(outboundTripId);
CREATE INDEX idx_reservations_booking_group ON reservations(bookingGroupId);
```

### Phase 3: Data Migration
- No existing data migration needed
- All new fields are optional
- Backward compatible with existing bookings

## 🎯 Performance Considerations

### Index Strategy
1. **Primary Indexes**
   - `by_return_trip`: Fast lookup of linked trips
   - `by_booking_group`: Efficient round trip reservation queries

2. **Compound Indexes**
   - Consider `by_driver_and_status_and_return` for driver dashboard
   - May need `by_route_and_date_and_return` for search optimization

### Query Optimization
1. **Denormalization Options**
   - Store route cities in trip for faster filtering
   - Cache combined prices in trips table
   - Duplicate key booking info for faster lookups

2. **Caching Strategy**
   - Cache linked trip data for search results
   - Store calculated prices in memory
   - Prefetch return trips in search queries

## 🔒 Data Integrity

### Constraints
1. **Business Rules**
   ```typescript
   // Enforce in application layer
   const validateTripLink = (outbound: Trip, return: Trip) => {
     // Same driver
     if (outbound.driverId !== return.driverId) {
       throw new Error("Trips must belong to same driver");
     }
     
     // Reversed route
     if (!isReversedRoute(outbound, return)) {
       throw new Error("Return trip must have reversed route");
     }
     
     // Timing constraint
     if (return.departureTime <= outbound.arrivalTime) {
       throw new Error("Return must depart after outbound arrival");
     }
   };
   ```

2. **Referential Integrity**
   - Maintain bidirectional references
   - Clean up on trip deletion
   - Validate before unlinking

### Transaction Safety
```typescript
// Atomic round trip booking
const createRoundTripBooking = async (data: RoundTripData) => {
  return await ctx.db.transaction(async (tx) => {
    // Create booking group
    const groupId = generateBookingGroupId();
    
    // Create both temp bookings
    const outboundTemp = await tx.insert("tempBookings", {...});
    const returnTemp = await tx.insert("tempBookings", {...});
    
    // Create payment intent
    const paymentIntent = await createPaymentIntent({...});
    
    // Return transaction result
    return { groupId, outboundTemp, returnTemp, paymentIntent };
  });
};
```

## 📊 Analytics Considerations

### Metrics to Track
1. **Adoption Metrics**
   - Round trip booking percentage
   - Average discount percentage used
   - Conversion rate improvement

2. **Performance Metrics**
   - Query response times
   - Index hit rates
   - Transaction success rates

3. **Business Metrics**
   - Revenue per booking type
   - Advance booking patterns
   - Cancellation rates by type

### Reporting Queries
```typescript
// Round trip adoption rate
const getRoundTripStats = async (startDate: number, endDate: number) => {
  const allReservations = await ctx.db
    .query("reservations")
    .filter(q => 
      q.and(
        q.gte(q.field("createdAt"), startDate),
        q.lte(q.field("createdAt"), endDate)
      )
    )
    .collect();
  
  const roundTripCount = allReservations.filter(r => r.isRoundTrip).length;
  const totalCount = allReservations.length;
  
  return {
    roundTripPercentage: (roundTripCount / totalCount) * 100,
    roundTripBookings: roundTripCount / 2, // Divide by 2 for actual round trips
    oneWayBookings: totalCount - roundTripCount
  };
};
```

---

*This technical design ensures a robust, scalable implementation of round trip bookings while maintaining backward compatibility and system performance.*