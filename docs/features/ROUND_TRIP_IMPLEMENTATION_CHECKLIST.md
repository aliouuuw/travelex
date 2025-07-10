# Round Trip Booking Implementation Checklist

*Quick reference guide for implementing round trip booking feature*

## 📋 Pre-Implementation Setup

- [ ] Review `ROUND_TRIP_BOOKING.md` for complete architecture
- [ ] Set up local development environment
- [ ] Create feature branch: `feature/round-trip-booking`

## 🗄️ Database Schema Updates

### `convex/schema.ts`
- [ ] Add `returnTripId` field to trips table
- [ ] Add `outboundTripId` field to trips table
- [ ] Add `roundTripDiscount` field to trips table
- [ ] Add indexes: `by_return_trip`, `by_outbound_trip`
- [ ] Add `bookingGroupId` to reservations table
- [ ] Add `linkedReservationId` to reservations table
- [ ] Add `isRoundTrip` to reservations table
- [ ] Deploy schema changes to Convex

## 🔧 Backend Implementation

### Trip Linking Functions (`convex/trips.ts`)
- [ ] Implement `linkReturnTrip` mutation
  - [ ] Validate same driver
  - [ ] Validate reversed route
  - [ ] Validate return timing
  - [ ] Update both trips
- [ ] Implement `unlinkReturnTrip` mutation
  - [ ] Check for existing bookings
  - [ ] Clear references
- [ ] Implement `getEligibleReturnTrips` query
  - [ ] Filter by driver
  - [ ] Filter by reversed route
  - [ ] Filter by timing
- [ ] Add `getRoundTripDetails` query

### Search Enhancements (`convex/tripSearch.ts`)
- [ ] Update search to accept `tripType` parameter
- [ ] Filter round trip results (only linked trips)
- [ ] Calculate combined pricing with discounts
- [ ] Return structured round trip data

### Booking Updates (`convex/payments.ts`)
- [ ] Create `createRoundTripPaymentIntent` mutation
- [ ] Update `processSuccessfulPayment` for round trips
- [ ] Handle booking group creation
- [ ] Implement atomic reservation creation

## 🎨 Frontend Implementation

### Search Form (`src/components/TravelExBookingFlow.tsx`)
- [ ] Add trip type selector (radio buttons)
- [ ] Add return date picker
- [ ] Implement date validation
- [ ] Update form state interface
- [ ] Handle trip type changes
- [ ] Pass trip type to search

### Search Results (`src/pages/search.tsx`)
- [ ] Create `RoundTripResultCard` component
- [ ] Display outbound and return details
- [ ] Show combined pricing
- [ ] Highlight savings amount
- [ ] Update filtering for round trips

### Booking Page (`src/pages/book.tsx`)
- [ ] Update `BookingFormData` interface
- [ ] Fetch return trip data
- [ ] Create tabbed interface for trips
- [ ] Implement dual seat selection
- [ ] Handle separate luggage selection
- [ ] Calculate combined pricing
- [ ] Update review step

### Payment Updates (`src/pages/payment.tsx`)
- [ ] Handle round trip payment intent
- [ ] Display both trip details
- [ ] Show price breakdown
- [ ] Update success handling

### Confirmation (`src/pages/booking-success.tsx`)
- [ ] Display both reservations
- [ ] Show unified booking reference
- [ ] Update receipt format

## 👨‍💼 Driver Interface

### Trip Management (`src/pages/driver/trips/index.tsx`)
- [ ] Add "Link Return Trip" button
- [ ] Create linking modal component
- [ ] Display linked trip indicators
- [ ] Add unlink functionality
- [ ] Show round trip badges

### Trip Card Updates (`src/components/trip-card.tsx`)
- [ ] Display return trip badge
- [ ] Show linked trip details
- [ ] Add management actions
- [ ] Display discount percentage

## 🧪 Testing

### Unit Tests
- [ ] Trip linking validation
- [ ] Price calculation with discounts
- [ ] Date validation logic
- [ ] Search filtering

### Integration Tests
- [ ] Complete booking flow
- [ ] Payment processing
- [ ] Reservation creation
- [ ] Error handling

### Manual Testing
- [ ] Driver trip linking
- [ ] Passenger search (one-way)
- [ ] Passenger search (round trip)
- [ ] Booking both trips
- [ ] Payment completion
- [ ] Confirmation display
- [ ] Edge cases

## 🚀 Deployment

### Pre-deployment
- [ ] Code review completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Migration plan ready

### Deployment Steps
- [ ] Deploy Convex functions
- [ ] Deploy frontend changes
- [ ] Verify in staging
- [ ] Monitor for errors

### Post-deployment
- [ ] Verify trip linking works
- [ ] Test complete booking flow
- [ ] Monitor error rates
- [ ] Check performance metrics

## 📊 Success Criteria

- [ ] Drivers can link/unlink trips
- [ ] Passengers can search round trips
- [ ] Booking completes for both trips
- [ ] Payment processes correctly
- [ ] Reservations created for both
- [ ] Confirmation shows both trips
- [ ] No regression in one-way bookings

## 🐛 Common Issues & Solutions

### Issue: Return trip not showing
- Check trip linking references
- Verify route is reversed
- Confirm timing constraints

### Issue: Payment failing
- Verify total amount calculation
- Check payment metadata
- Confirm temp booking creation

### Issue: Seat availability mismatch
- Ensure real-time seat updates
- Check reservation atomicity
- Verify cleanup on failure

## 📈 Monitoring

- [ ] Set up analytics for round trip adoption
- [ ] Monitor booking completion rates
- [ ] Track discount effectiveness
- [ ] Watch for error patterns

---

**Remember:** Test thoroughly at each step. Round trip booking affects critical payment flows.