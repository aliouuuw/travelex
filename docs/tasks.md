# TravelEx - Project Tasks Breakdown

> **Strategy Update:** The project will now focus on building the admin and driver management platform first. Public-facing passenger features (like self-serve booking) will be postponed. New user sign-ups will be for **admins only** initially, who will then be responsible for creating and validating driver accounts.

## Phase 1: Foundation & Project Setup (Sprint 1)

- [x] **Project Initialization:**
    - [x] Setup React project using Vite with TypeScript template.
    - [x] Install and configure ESLint, Prettier for code quality.
    - [x] Initialize Git repository and setup `main` and `develop` branches.
- [x] **UI Framework & Styling:**
    - [x] Setup `shadcn/ui` for UI components.
    - [x] Setup theme provider with brand colors and typography.
- [x] **Core Architecture:**
    - [x] Setup file structure for components, pages, services, etc.
    - [x] Implement routing solution (React Router).
    - [x] Setup `Zustand` for global client state management.
    - [x] Setup `TanStack Query` for server state management.
    - [x] Install `React Hook Form` and `Zod` for form handling.
- [x] **Backend & Database Setup:**
    - [x] Setup Supabase project (Database, Auth, Storage).
    - [x] Design initial database schema for Users (Profiles), Drivers, and Vehicles in Supabase.

## Phase 2: Admin Dashboard & Core Management (Sprints 2-4)

- [ ] **Authentication & Admin Access:**
    - [x] Implement admin registration and login forms.
    - [x] Implement authentication flow using Supabase Auth (default role: admin).
    - [x] Create protected routes for authenticated admin users.
- [ ] **Admin Dashboard UI:**
    - [ ] Create the main layout for the admin dashboard.
    - [ ] Implement navigation for different management sections.
    - [ ] Update Header component to provide role-based dashboard links.
- [ ] **Driver & User Management:**
    - [ ] Build UI for admins to view a list of all drivers with their login status.
    - [ ] Build UI for driver's dashboard to display their name and a form to update their password.
    - [ ] Develop corresponding Supabase API (RPC functions) for user management.
- [ ] **Route & Station Management:**
    - [ ] Build UI forms for creating/editing routes (cities, fares).
    - [ ] Build UI for managing stations within cities.
    - [ ] Develop corresponding Supabase API for route and station management.
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

## Phase 3: Public-Facing Features (Postponed)

- [ ] **Trip Search & Discovery:**
    - [ ] Create Supabase database function (or RPC) for searching trips.
    - [ ] Create the home page with the trip search form (cities, date).
    - [ ] Develop the trip search results page.
    - [ ] Implement filtering logic (seats, car type, driver score).
- [ ] **Database Schema Expansion:**
    - [ ] Refine schema in Supabase for Cities, Stations, Routes, and Trips.
    - [ ] Design schema in Supabase for Luggage Policies.
    - [ ] Design schema in Supabase for Bookings.

## Phase 4: Booking & Payment Flow (Postponed)

- [ ] **Multi-Step Booking Form:**
    - [ ] Build multi-step booking form using `React Hook Form` and `Zustand`.
    - [ ] **Step 1: Seat Selection:**
    - [ ] **Step 2: Luggage Options:**
    - [ ] **Step 3: Review & Summary:**
- [ ] **Payment Integration:**
    - [ ] Integrate Stripe SDK for payment processing.
    - [ ] Create Supabase Edge Function to handle Stripe payment intent creation.
    - [ ] Create Supabase Edge Function to handle Stripe webhooks.
- [ ] **Booking Confirmation:**
    - [ ] Create Supabase database function to finalize booking after payment.
    - [ ] Setup `Resend` for transactional emails.
    - [ ] Implement email templates using `React Email` for receipts and tickets.
    - [ ] Trigger email confirmation via a Supabase Edge Function upon successful booking.

## Phase 5: Testing, Deployment & Launch (Sprints 5-6)

- [ ] **Testing:**
    - [ ] Write unit/integration tests with `Vitest`.
    - [ ] Perform end-to-end tests with `Playwright` for admin and driver flows.
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

---

## Session Recap 2 (For Next Chat)

**Objective:** Pivot to an admin-first strategy and begin building the Admin Dashboard.

**Session Summary:**
- **Pivoted Strategy:** We shifted the project's focus to an admin-first approach. The immediate goal is to build the management platform for admins to control the system and validate drivers.
- **Updated Roadmap:** The `tasks.md` file was overhauled to reflect this new strategy, prioritizing the Admin Dashboard and postponing public-facing passenger features.
- **Refined Data Model:** The database schema was significantly improved to use `UUID`s, integrate with Supabase Auth via a `profiles` table, and support multi-seat bookings. The `data_model.md` file is now up-to-date.
- **Implemented `profiles` Table:** We created the initial Supabase migration script for the `profiles` table, including a trigger to automatically create a profile for new users with a default `admin` role.
- **Enhanced Auth Flow:** The front-end sign-up and login flows were improved with a `full_name` field, better error handling, and more specific user feedback.

**Next Step:**
- The immediate next task is to **build the Admin Dashboard UI**. This involves creating the main layout with a persistent sidebar for navigation and a main content area for the different management sections (as outlined in Phase 2 of our updated roadmap). 