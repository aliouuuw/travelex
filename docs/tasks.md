# TravelEx - Project Tasks Breakdown

## Phase 1: Foundation & Project Setup (Sprint 1)

- [x] **Project Initialization:**
    - [x] Setup React project using Vite with TypeScript template.
    - [x] Install and configure ESLint, Prettier for code quality.
    - [x] Initialize Git repository and setup `main` and `develop` branches.
- [x] **UI Framework & Styling:**
    - [x] Setup `shadcn/ui` for UI components.
    - [x] Setup theme provider with brand colors and typography (`#fb8346`, `#0a2137`, DM Sans, Inter).
- [x] **Core Architecture:**
    - [x] Setup file structure for components, pages, services, etc.
    - [x] Implement routing solution (e.g., React Router).
    - [x] Setup `Zustand` for global client state management.
    - [x] Setup `TanStack Query` for server state management (data fetching, caching).
    - [x] Install `React Hook Form` and `Zod` for form handling and validation.
- [x] **Backend & Database Setup:**
    - [x] Setup Supabase project (Database, Auth, Storage).
    - [ ] Design initial database schema for Users, Drivers, and Vehicles in Supabase.

## Phase 2: Core User Features (Sprints 2-4)

- [x] **Authentication:**
    - [x] Implement user registration and login forms.
    - [x] Implement authentication flow using Supabase Auth.
    - [x] Create protected routes for authenticated users.
- [ ] **Trip Search & Discovery:**
    - [ ] Create Supabase database function (or RPC) for searching trips.
    - [ ] Create the home page with the trip search form (cities, date).
    - [ ] Develop the trip search results page.
    - [ ] Implement filtering logic (seats, car type, driver score).
- [ ] **Database Schema Expansion:**
    - [ ] Refine schema in Supabase for Cities, Stations, Routes, and Trips.
    - [ ] Design schema in Supabase for Luggage Policies.
    - [ ] Design schema in Supabase for Bookings.

## Phase 3: Booking & Payment Flow (Sprints 5-6)

- [ ] **Multi-Step Booking Form:**
    - [ ] Build multi-step booking form using `React Hook Form` and `Zustand`.
    - [ ] **Step 1: Seat Selection:**
        - [ ] Develop the interactive vehicle seat map component.
        - [ ] Implement logic for selecting/deselecting seats.
    - [ ] **Step 2: Luggage Options:**
        - [ ] Develop UI for adding extra luggage based on trip policy.
    - [ ] **Step 3: Review & Summary:**
        - [ ] Display a comprehensive summary of the booking.
- [ ] **Payment Integration:**
    - [ ] Integrate Stripe SDK for payment processing.
    - [ ] Create Supabase Edge Function to handle Stripe payment intent creation.
    - [ ] Create Supabase Edge Function to handle Stripe webhooks.
- [ ] **Booking Confirmation:**
    - [ ] Create Supabase database function to finalize booking after payment.
    - [ ] Setup `Resend` for transactional emails.
    - [ ] Implement email templates using `React Email` for receipts and tickets.
    - [ ] Trigger email confirmation via a Supabase Edge Function upon successful booking.

## Phase 4: Driver Dashboard & Management (Sprints 7-9)

- [ ] **Driver Dashboard UI:**
    - [ ] Create the main layout for the driver dashboard.
    - [ ] Implement navigation for different management sections.
- [ ] **Route & Station Management:**
    - [ ] Build UI forms for creating/editing routes (cities, fares).
    - [ ] Build UI for managing stations within cities.
    - [ ] Develop corresponding Supabase API (RPC functions) for route and station management.
- [ ] **Trip Management:**
    - [ ] Build UI for creating, updating, and deleting trips.
    - [ ] Link trips to routes, vehicles, and luggage policies.
    - [ ] Develop corresponding Supabase API for trip management.
- [ ] **Luggage Policy Management:**
    - [ ] Build UI for defining luggage policies.
    - [ ] Develop corresponding Supabase API for luggage policy management.
- [ ] **Reservation Management:**
    - [ ] Create a view to see all reservations for a driver's trips.
    - [ ] Implement actions like viewing passenger details.

## Phase 5: Testing, Deployment & Launch (Sprints 10-11)

- [ ] **Testing:**
    - [ ] Write unit/integration tests with `Vitest`.
    - [ ] Perform end-to-end tests with `Playwright` for user and driver flows.
    - [ ] Conduct user acceptance testing (UAT).
- [ ] **Deployment:**
    - [ ] Setup production environment on `Vercel` or `Netlify` for the frontend.
    - [ ] Configure CI/CD pipeline for automated deployments.
    - [ ] Manage Supabase database migrations.
- [ ] **Launch:**
    - [ ] Final pre-launch checks.
    - [ ] Official launch.
    - [ ] Monitor application performance and logs.

## Post-Launch
- [ ] Gather user feedback for future iterations.
- [ ] Prioritize and fix bugs.
- [ ] Plan for V2 features. 