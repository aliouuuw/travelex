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

- [x] **Authentication & Admin Access:**
    - [x] Implement admin registration and login forms.
    - [x] Implement authentication flow using Supabase Auth (default role: admin).
    - [x] Create protected routes for authenticated admin users.
    - [x] Implement role-based authentication and redirection.
    - [x] Create AdminRoute and DriverRoute components for role-based access control.
- [x] **Admin Dashboard UI:**
    - [x] Create the main layout for the admin dashboard with sidebar navigation.
    - [x] Implement navigation for different management sections.
    - [x] Update Header component to provide role-based dashboard links.
- [x] **Driver & User Management:**
    - [x] Build UI for admins to view a list of all drivers with their login status.
    - [x] Build UI for driver's dashboard to display their name and a form to update their password.
    - [x] Create Supabase Edge Function for secure driver invitation with email.
    - [x] Develop corresponding Supabase API (RPC functions) for user management.
    - [x] Implement driver creation flow with temporary password email invitation.
    - [x] **NEW:** Implement signup request approval workflow for better driver onboarding.
    - [x] **NEW:** Create admin page for reviewing and approving driver applications.
    - [x] **NEW:** Add password reset functionality for existing drivers.
    - [x] **NEW:** Resolve RLS permission issues with signup requests table.
    - [x] **NEW:** Enhance driver invitation flow with proper password setup pages.
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

## Session Recap 3 (For Next Chat)

**Objective:** Implement role-based authentication, create admin and driver dashboards, and build driver management functionality.

**Session Summary:**
- **Enhanced Authentication Flow:** Upgraded the `AuthProvider` to fetch user profiles including roles from the database. Implemented role-based redirection where admins go to `/admin/dashboard`, drivers to `/driver/dashboard`, and regular users to `/dashboard`.

- **Role-Based Route Protection:** Created `AdminRoute` and `DriverRoute` components that check user roles and redirect unauthorized users with appropriate error messages. Updated the Header component to dynamically link to the correct dashboard based on user role.

- **Admin Dashboard Implementation:** 
  - Built a complete admin layout with sidebar navigation
  - Created a drivers list page that displays all registered drivers with their email, last sign-in date, and status (Active/Pending)
  - Implemented a "Add Driver" form that sends email invitations with temporary passwords
  - Created Supabase Edge Function `invite-driver` to securely handle driver invitations server-side

- **Driver Dashboard Implementation:**
  - Built a personalized driver dashboard that welcomes users by name
  - Added a password update form allowing drivers to change their temporary passwords
  - Implemented secure password update functionality using Supabase Auth

- **Database & Security Enhancements:**
  - Fixed the problematic migration that defaulted all new users to 'admin' role
  - Created new migration to ensure regular signups default to 'passenger' role
  - Built `get_drivers` RPC function with proper security permissions to fetch driver data
  - Resolved complex Supabase permission issues for accessing auth.users table

- **Technical Challenges Resolved:**
  - Fixed CORS issues in Supabase Edge Functions
  - Resolved TypeScript type errors with Badge component variants
  - Debugged and fixed persistent "permission denied for table users" errors through proper function security configuration

**Current State:** The platform now has a fully functional admin panel for managing drivers and a basic driver dashboard. Admins can create drivers who receive email invitations, and drivers can log in and update their passwords.

**Next Steps:** 
- Implement route and station management for admins
- Add trip management functionality  
- Build reservation/booking management
- Enhance driver dashboard with ride management features 