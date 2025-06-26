# Project Context – TravelEx

## 1. Overview

This project is to build a premium ride-sharing platform, **TravelEx**, connecting passengers with drivers for inter-city travel. The platform will provide a seamless booking experience for users and a comprehensive management dashboard for drivers.

## 2. Project Goals

- **For Users:** To provide a simple, secure, and intuitive interface for finding, booking, and paying for inter-city rides with flexible segment booking options.
- **For Drivers:** To offer a powerful set of tools for managing their route templates, trip scheduling, vehicles, and reservations, maximizing their business potential.
- **For Business:** To establish TravelEx as a trusted, premium brand in the inter-city transport market with efficient operational workflows.

## 3. Core Features

### 3.1. Driver-Focused Platform (Current Priority)

#### Route Template Management
- **Route Templates as Intercity Blueprints:** Drivers create reusable route templates defining city-to-city connections (e.g., "Tamale → Kumasi → Accra").
- **Visual Flowchart Interface:** Horizontal city progression with vertical station lists per city for intuitive route visualization.
- **Station Configuration:** Each city in a template contains multiple available stations that drivers can choose from when scheduling trips.
- **Segment Pricing:** Fixed rates for intercity segments (e.g., Tamale-Kumasi: $25, Kumasi-Accra: $30, Tamale-Accra: $50).

#### Trip Scheduling from Templates
- **Template-Based Scheduling:** Drivers select a route template and schedule specific trips with departure times.
- **Station Pre-Selection:** For each scheduled trip, drivers pre-select which stations they'll serve in each city for operational efficiency.
- **Calendar Management:** Visual calendar interface for managing scheduled trips and availability.
- **Real-Time Updates:** Trip status management (scheduled, in-progress, completed, cancelled).

#### Vehicle & Policy Management
- **Vehicle Fleet Administration:** Register and manage vehicle details (make, model, type, capacity, seat map).
- **Luggage Policy Configuration:** Create and manage distinct luggage policies (size limits, extra fees) and assign to trips.

#### Reservation Management
- **Segment-Based Reservations:** View all reservations including pickup/dropoff stations for segment passengers.
- **Passenger Management:** View passenger details, approve reservations, manage boarding logistics.

### 3.2. Passenger-Facing Platform (Future Implementation)

#### Advanced Trip Search & Segment Booking
- **Segment-Based Search:** Passengers searching "Kumasi to Accra" will find results from "Tamale → Kumasi → Accra" scheduled trips.
- **Route Context Display:** Search results show full route context to encourage extended trip planning.
- **Flexible Booking:** Passengers can book any valid segment of a scheduled trip with station-specific pickup/dropoff.

#### Multi-Step Reservation Flow
1. **Trip & Segment Selection:** Choose specific intercity segment from available scheduled trips.
2. **Station Selection:** Select pickup and dropoff stations within chosen cities.
3. **Seat Selection:** Visual, interactive vehicle layout for seat selection.
4. **Luggage Options:** Add extra luggage based on driver's predefined policies.
5. **Booking Summary:** Review segment details, stations, seats, luggage, and total price.
6. **Payment:** Secure payment processing via Stripe integration.
7. **Confirmation:** Automated e-receipt and trip details sent via email.

#### Enhanced Discovery Features
- **Filtered Results:** Search results can be filtered by:
    - Number of available seats
    - Vehicle type (e.g., Electric, Gas)
    - Driver's score/rating
    - Price range
    - Departure times
- **Route Visualization:** Interactive maps showing full route context and available segments.

### 3.3. Admin Management Platform

#### Driver Onboarding & Management
- **Application Review System:** Approve driver applications with email invitation workflow.
- **Driver Oversight:** Monitor driver performance, ratings, and operational metrics.
- **Fleet Management:** Overview of all vehicles and route templates across the platform.

## 4. Key Design Innovations

### 4.1. Route Template Concept
- **Reusable Patterns:** Routes are templates, not specific scheduled instances.
- **Operational Efficiency:** Drivers pre-select stations for each trip to streamline boarding logistics.
- **Passenger Flexibility:** Any valid segment can be booked, maximizing seat utilization.

### 4.2. Segment-Based Booking System
- **Enhanced Utilization:** Passengers can join ongoing routes at intermediate points.
- **Dynamic Pricing:** Fixed intercity rates with transparent segment pricing.
- **Extended Planning:** Full route visibility encourages longer trip bookings.

### 4.3. Visual Route Management
- **Flowchart Layout:** Horizontal city connections with vertical station arrays.
- **Intuitive Interface:** Clear visual representation of complex routing relationships.
- **Scalable Design:** Supports routes with multiple cities and numerous stations per city.

## 5. Technical & Design Specifications

### 5.1. Technical Requirements
- Real-time database for live availability updates and trip status.
- Secure and reliable Stripe integration for segment-based payments.
- Robust email notification system for confirmations, trip updates, and alerts.
- Fully responsive web application optimized for both desktop and mobile devices.
- Advanced search algorithms for segment-based trip discovery.

### 5.2. Brand & Visual Identity
- **Brand Colors:**
    - Primary: Orange (`#fb8346`)
    - Secondary: Dark Blue (`#0a2137`)
    - Background: White
    - Foreground: Black
- **Typography:**
    - Fonts: DM Sans, Inter
    - Weights: 400 (Regular), 500 (Medium), 700 (Bold)

## 6. Workflow Overview

### 6.1. Driver Workflow
1. **Template Creation:** Design route templates with city sequences and available stations.
2. **Trip Scheduling:** Use templates to schedule specific trips with departure times.
3. **Station Selection:** Pre-select which stations to serve for each scheduled trip.
4. **Reservation Management:** Monitor and manage passenger bookings across all trip segments.
5. **Trip Execution:** Conduct trips with clear station schedules and passenger manifests.

### 6.2. Passenger Workflow
1. **Search:** Enter departure and destination cities with preferred travel date.
2. **Discovery:** Browse available trips including segment options from longer routes.
3. **Selection:** Choose specific trip segment and pickup/dropoff stations.
4. **Booking:** Complete seat selection, luggage options, and payment.
5. **Travel:** Board at selected station with clear trip and seat information.

This approach creates a flexible, efficient intercity transport system that maximizes both operational efficiency for drivers and booking convenience for passengers.


