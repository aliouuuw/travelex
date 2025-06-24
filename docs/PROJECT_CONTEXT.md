# Project Context – TravelEx

## 1. Overview

This project is to build a premium ride-sharing platform, **TravelEx**, connecting passengers with drivers for inter-city travel. The platform will provide a seamless booking experience for users and a comprehensive management dashboard for drivers.

## 2. Project Goals

- **For Users:** To provide a simple, secure, and intuitive interface for finding, booking, and paying for inter-city rides.
- **For Drivers:** To offer a powerful set of tools for managing their routes, trips, vehicles, and reservations, maximizing their business potential.
- **For Business:** To establish TravelEx as a trusted, premium brand in the inter-city transport market.

## 3. Core Features

### 3.1. User-Facing Platform

#### Trip Discovery & Booking
- **Dynamic Trip Search:** Users can search for available trips by selecting departure and destination cities, along with the desired date and time.
- **Filtered Results:** Search results will display a list of available trips, which can be filtered by:
    - Number of available seats
    - Car type (e.g., Electric, Gaz)
    - Driver's score/rating
- **Detailed Trip View:** Users can view comprehensive details for each trip, including pickup and drop-off stations, driver information, and vehicle details.

#### Multi-Step Reservation Form
1.  **Seat Selection:** A visual, interactive layout of the vehicle will be shown, allowing users to select their desired seat(s).
2.  **Luggage Options:** Users can add extra luggage based on the driver's predefined luggage policies and limits.
3.  **Booking Summary:** A final review of the reservation details (trip, seats, luggage, total price).
4.  **Payment:** Secure payment processing via a Stripe integration.
5.  **Confirmation:** Automated e-receipt and trip ticket sent to the user's email upon successful payment.

### 3.2. Driver-Facing Platform

#### Centralized Dashboard
- A comprehensive dashboard for managing all aspects of their service:
    - Reservations management (view, approve, cancel)
    - Trip scheduling and management
    - Vehicle fleet administration
    - Performance analytics (e.g., earnings, ratings)

#### Core Management Features
- **Route Management (Central Feature):**
    - Define routes with at least two cities.
    - Assign multiple pickup/drop-off stations for each city within a route.
    - Set inter-city fares for each route.
- **Luggage Policy Management (Central Feature):**
    - Create and manage distinct luggage policies (e.g., size limits, extra fees).
    - Attach a specific luggage policy to each trip.
- **Vehicle Management:**
    - Register and manage vehicle details (make, model, type, capacity).

## 4. Technical & Design Specifications

### 4.1. Technical Requirements
- Real-time database for live availability updates (e.g., seats).
- Secure and reliable Stripe integration for payments.
- Robust email notification system for confirmations and alerts.
- A fully responsive web application for seamless use on desktop and mobile devices.

### 4.2. Brand & Visual Identity
- **Brand Colors:**
    - Primary: Orange (`#fb8346`)
    - Secondary: Dark Blue (`#0a2137`)
- **Typography:**
    - Fonts: DM Sans, Inter
    - Weights: 400 (Regular), 500 (Medium), 700 (Bold)


