# Round Trip Booking Feature Implementation

*Date: January 2025*  
*Status: 🚧 PLANNED - Ready for Implementation*

## 🎯 Overview

TravelEx will support both one-way and round trip bookings, allowing passengers to book their outbound and return journeys in a single transaction. The implementation leverages a driver-controlled trip linking system where drivers can designate trips as "return" trips for other trips.

## 🏗️ Architecture

### Core Concept
- **Driver-Controlled Linking**: Drivers create individual trips and can link them as return trips
- **Automatic Pairing**: Passengers booking round trips automatically get both linked trips
- **Single Transaction**: One payment covers both trips with potential discounts
- **Unified Booking Flow**: Single form handles seat/bag selection for both trips

### Benefits
- **Flexibility**: Drivers maintain control over trip scheduling
- **Simplicity**: No complex round trip creation UI for drivers
- **Efficiency**: Passengers book both trips in one flow
- **Savings**: Round trip discounts incentivize advance booking

## 📊 Database Schema Updates

### 1. Trips Table Enhancement
```typescript
// convex/schema.ts
trips: defineTable({
  // ... existing fields ...
  returnTripId: v.optional(v.id("trips")),      // Points to the return trip
  outboundTripId: v.optional(v.id("trips")),    // Reverse reference
  roundTripDiscount: v.optional(v.number()),    // Optional discount percentage (0-1)
})
  // ... existing indexes ...
  .index("by_return_trip", ["returnTripId"])
  .index("by_outbound_trip", ["outboundTripId"])
```

### 2. Reservations Enhancement
```typescript
// Optional: Add booking group for linked reservations
reservations: defineTable({
  // ... existing fields ...
  bookingGroupId: v.optional(v.string()),       // Links round trip reservations
  linkedReservationId: v.optional(v.id("reservations")), // Direct link to paired reservation
  isRoundTrip: v.optional(v.boolean()),         // Indicates if part of round trip
})
  .index("by_booking_group", ["bookingGroupId"])
```

## 🚀 Implementation Plan

### Phase 1: Backend Infrastructure

#### 1.1 Trip Linking Functions (`convex/trips.ts`)
```typescript
// Link two trips as round trip pair
export const linkReturnTrip = mutation({
  args: {
    outboundTripId: v.id("trips"),
    returnTripId: v.id("trips"),
    roundTripDiscount: v.optional(v.number()), // 0.1 = 10% discount
  },
  handler: async (ctx, args) => {
    // Validate both trips exist and belong to same driver
    // Validate route compatibility (cities must be swapped)
    // Validate timing (return departure > outbound arrival)
    // Update both trips with cross-references
    // Return success/error status
  },
});

// Unlink trips
export const unlinkReturnTrip = mutation({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    // Check no round trip bookings exist
    // Clear both trip references
    // Return success/error status
  },
});

// Get trips eligible for return linking
export const getEligibleReturnTrips = query({
  args: {
    outboundTripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    // Get outbound trip details
    // Find trips with:
    //   - Same driver
    //   - Swapped origin/destination
    //   - Departure after outbound arrival
    //   - Not already linked
    // Return eligible trips
  },
});
```

#### 1.2 Search Enhancements (`convex/tripSearch.ts`)
```typescript
// Enhanced search to include round trip options
export const searchTripsWithRoundTrip = query({
  args: {
    fromCity: v.string(),
    toCity: v.string(),
    departureDate: v.optional(v.number()),
    returnDate: v.optional(v.number()),
    passengers: v.optional(v.number()),
    tripType: v.union(v.literal("one-way"), v.literal("round-trip")),
  },
  handler: async (ctx, args) => {
    if (args.tripType === "round-trip") {
      // Only return trips that have returnTripId set
      // Validate return trip meets date criteria
      // Calculate combined pricing with discount
    }
    // Return enhanced trip results
  },
});
```

### Phase 2: Driver Interface

#### 2.1 Trip Management UI Updates
- **Trip Card Enhancement**: Add "Link Return Trip" button
- **Link Modal**: Show eligible return trips with:
  - Route validation (must be reverse route)
  - Time validation (return after outbound)
  - Visual route display
- **Visual Indicators**:
  - "Has Return Trip" badge
  - "Return Trip for: [Details]" label
  - Unlink option (if no bookings)

#### 2.2 Driver Dashboard Updates
```typescript
// Component updates needed:
// src/pages/driver/trips/index.tsx
// - Add return trip indicators
// - Show linked trip details
// - Add link/unlink actions

// src/components/trip-card.tsx
// - Display round trip badges
// - Show discount percentage
// - Add link management buttons
```

### Phase 3: Passenger Interface

#### 3.1 Search Form Updates (`TravelExBookingFlow.tsx`)
```typescript
interface SearchFormData {
  fromCity: string;
  toCity: string;
  fromStation: string;
  toStation: string;
  departureDate: Date | undefined;
  passengers: number;
  tripType: 'one-way' | 'round-trip';    // NEW
  returnDate?: Date;                     // NEW
}

// UI Components:
// - Radio buttons or toggle for trip type
// - Conditional return date picker
// - Return date validation (must be after departure)
// - Clear visual separation between dates
```

#### 3.2 Search Results Enhancement (`search.tsx`)
```typescript
// Display format for round trips:
interface RoundTripResult {
  outbound: {
    date: string;
    time: string;
    route: string;
    duration: string;
    price: number;
  };
  return: {
    date: string;
    time: string;
    route: string;
    duration: string;
    price: number;
  };
  totalPrice: number;
  savings: number;
  discountPercentage: number;
}

// Visual enhancements:
// - Tabbed display (Outbound | Return)
// - Combined price with savings highlight
// - Clear trip pairing indication
```

#### 3.3 Booking Page Major Update (`book.tsx`)
```typescript
interface BookingFormData {
  // Outbound trip data
  pickupStationId: string;
  dropoffStationId: string;
  selectedSeats: string[];
  numberOfBags: number;
  
  // Return trip data (NEW)
  returnTripId?: string;
  returnPickupStationId?: string;
  returnDropoffStationId?: string;
  returnSelectedSeats?: string[];
  returnNumberOfBags?: number;
  
  // Shared passenger info
  passengerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  
  isRoundTrip: boolean;
  totalPrice: number;
  outboundPrice: number;
  returnPrice?: number;
  discountAmount?: number;
}

// Key implementation details:
// - Fetch both trips if round trip
// - Separate seat maps for each trip
// - Tabbed or accordion UI for trip selection
// - Combined price calculation
// - Single passenger info form
```

### Phase 4: Payment & Confirmation

#### 4.1 Payment Processing Updates
```typescript
// Modified payment intent creation
export const createRoundTripPaymentIntent = mutation({
  args: {
    outboundBooking: bookingSchema,
    returnBooking: v.optional(bookingSchema),
    bookingGroupId: v.string(),
    totalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Create temp bookings for both trips
    // Create single payment intent for total
    // Include metadata for both bookings
    // Return payment details
  },
});

// Webhook processing for round trips
export const processRoundTripPayment = action({
  args: {
    paymentIntentId: v.string(),
    bookingGroupId: v.string(),
  },
  handler: async (ctx, args) => {
    // Create both reservations
    // Link them with bookingGroupId
    // Update seat availability for both
    // Send confirmation for both trips
  },
});
```

#### 4.2 Booking Confirmation
- **Single confirmation page** showing both trips
- **Unified booking reference** for easy lookup
- **Email confirmation** with complete itinerary
- **QR codes** for each trip segment

## 🎨 UI/UX Design Specifications

### Trip Type Selector
```typescript
// Radio button design
<RadioGroup value={tripType} onValueChange={setTripType}>
  <div className="flex gap-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <RadioGroupItem value="one-way" />
      <span>One-way</span>
    </label>
    <label className="flex items-center gap-2 cursor-pointer">
      <RadioGroupItem value="round-trip" />
      <span>Round trip</span>
      {/* Optional: Show discount badge */}
      <Badge variant="secondary">Save 10%</Badge>
    </label>
  </div>
</RadioGroup>
```

### Date Selection
```typescript
// Enhanced date picker
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <Label>Departure Date</Label>
    <DatePicker 
      selected={departureDate}
      onChange={setDepartureDate}
      minDate={new Date()}
    />
  </div>
  
  {tripType === 'round-trip' && (
    <div>
      <Label>Return Date</Label>
      <DatePicker 
        selected={returnDate}
        onChange={setReturnDate}
        minDate={departureDate || new Date()}
        placeholderText="Select return date"
      />
    </div>
  )}
</div>
```

### Booking Flow - Seat Selection
```typescript
// Tabbed interface for round trips
<Tabs defaultValue="outbound">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="outbound">
      Outbound - {format(outboundDate, 'MMM d')}
    </TabsTrigger>
    <TabsTrigger value="return">
      Return - {format(returnDate, 'MMM d')}
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="outbound">
    <SeatSelectionGrid 
      trip={outboundTrip}
      selectedSeats={selectedSeats}
      onSeatSelect={handleOutboundSeatSelect}
    />
  </TabsContent>
  
  <TabsContent value="return">
    <SeatSelectionGrid 
      trip={returnTrip}
      selectedSeats={returnSelectedSeats}
      onSeatSelect={handleReturnSeatSelect}
    />
  </TabsContent>
</Tabs>
```

## 💰 Pricing Strategy

### Round Trip Discounts
```typescript
// Pricing calculation
const calculateRoundTripPrice = (outbound: number, return: number, discount: number) => {
  const subtotal = outbound + return;
  const discountAmount = subtotal * discount;
  const total = subtotal - discountAmount;
  
  return {
    subtotal,
    discountAmount,
    discountPercentage: discount * 100,
    total,
    savings: discountAmount,
  };
};

// Display format
// Regular Price: $178.00
// Round Trip Discount: -$17.80 (10% off)
// Total: $160.20
```

### Luggage Consistency
- Option to apply same luggage selection to both trips
- Or allow different luggage amounts per trip
- Clear pricing breakdown for each segment

## 🔧 Technical Considerations

### 1. Data Consistency
- **Atomic Operations**: Book both trips or neither
- **Rollback Logic**: Handle partial failures
- **Seat Locking**: Prevent double booking during payment

### 2. Edge Cases
- **Availability Changes**: Handle if return trip fills up
- **Price Changes**: Lock prices during booking session
- **Cancellations**: Define policies for partial cancellations
- **Modifications**: Allow changing one leg independently

### 3. Performance
- **Batch Queries**: Fetch both trips efficiently
- **Caching**: Cache linked trip data
- **Optimistic Updates**: Immediate UI feedback

### 4. Mobile Experience
- **Responsive Design**: Stack trips vertically on mobile
- **Touch-Friendly**: Large tap targets for seat selection
- **Progressive Disclosure**: Show one trip at a time

## 🧪 Testing Strategy

### Unit Tests
- Trip linking validation logic
- Price calculation with discounts
- Date validation rules
- Seat availability checks

### Integration Tests
- End-to-end booking flow
- Payment processing for both trips
- Webhook handling
- Reservation creation

### User Acceptance Tests
- Driver trip linking workflow
- Passenger search and booking
- Payment and confirmation
- Edge case handling

## 📈 Success Metrics

### Business Metrics
- **Round Trip Adoption Rate**: % of bookings that are round trip
- **Average Booking Value**: Increase from round trip sales
- **Advanced Booking Rate**: How far ahead round trips are booked
- **Discount Effectiveness**: Impact on conversion rates

### Technical Metrics
- **Booking Completion Rate**: Success rate for round trips
- **Error Rate**: Failed bookings or payment issues
- **Performance**: Page load and response times
- **User Satisfaction**: Feedback on booking experience

## 🚀 Rollout Plan

### Phase 1: Backend (Week 1)
- Database schema updates
- Trip linking functions
- Search query enhancements

### Phase 2: Driver Tools (Week 2)
- Trip linking interface
- Visual indicators
- Management dashboard

### Phase 3: Passenger Experience (Week 3-4)
- Search form updates
- Results display
- Booking flow enhancement

### Phase 4: Testing & Launch (Week 5)
- Comprehensive testing
- Bug fixes
- Gradual rollout
- Monitor metrics

## 🎯 Future Enhancements

### V2 Features
- **Open Return**: Book return later at guaranteed price
- **Multi-City**: Support for complex itineraries
- **Group Discounts**: Additional savings for multiple passengers
- **Loyalty Points**: Extra points for round trip bookings

### V3 Features
- **Dynamic Pricing**: AI-based discount optimization
- **Predictive Booking**: Suggest return dates based on patterns
- **Corporate Accounts**: Bulk round trip management
- **API Integration**: Third-party booking platforms

---

*This round trip booking feature will significantly enhance the TravelEx platform by providing convenience for passengers and increased revenue opportunities for drivers, while maintaining the simplicity and flexibility that makes the platform successful.*