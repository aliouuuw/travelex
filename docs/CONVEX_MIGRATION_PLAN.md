# TravelEx Supabase to Convex Migration Plan

## Overview

This document outlines the comprehensive migration plan from Supabase to Convex DB for the TravelEx platform. The migration addresses the issues with multiple Supabase migration files causing frequent breakages.

## Migration Status

### ✅ **Phase 1: Authentication Infrastructure (COMPLETED)**
- [x] Convex Auth setup with Password provider
- [x] Comprehensive schema definition with all entities
- [x] User management functions (profiles, roles, authentication)
- [x] New auth service with React hooks pattern
- [x] Convex client and provider setup

### ✅ **Phase 2: Frontend Auth Integration (COMPLETED)**
- [x] Update main app to use Convex providers
- [x] Migrate auth context to use Convex
- [x] Update auth components and pages
  - [x] Admin sign up & in
  - [x] Driver sign up request & sign in
- [x] Test authentication flow

### ✅ **Phase 3: Core Business Logic Migration (COMPLETED)**
- [x] **Countries and cities management (COMPLETED)**
  - [x] Migrate country CRUD operations to Convex
  - [x] Implement global city creation functionality
  - [x] Update country request system for Convex
  - [x] Migrate enhanced city selector to use Convex
- [x] **Route templates and pricing (COMPLETED)**
  - [x] Migrate route template creation to Convex
  - [x] Implement intercity pricing with Convex
  - [x] Update all route template CRUD operations
  - [x] Migrate reusable cities/stations to Convex
  - [x] Fix authentication issues in route template functions
- [x] **Trip scheduling and management (COMPLETED)**
  - [x] Migrate trip CRUD operations to Convex
  - [x] Implement trip calendar and scheduling system
  - [x] Update driver trip management pages
  - [x] Fix authentication issues in trip functions
- [x] **Vehicle and luggage policies (COMPLETED)**
  - [x] Migrate vehicle management system from Supabase to Convex
  - [x] Migrate luggage policy management from Supabase to Convex
  - [x] Update integration points with trip scheduling
  - [x] Implement vehicle CRUD operations with Convex
  - [x] Implement luggage policy CRUD operations with Convex
  - [x] Update frontend components to use Convex hooks
  - [x] Fix authentication and TypeScript integration issues

### ⏳ **Phase 4: Reservation and Payment System**
- [ ] Reservation management
- [ ] Payment processing with Stripe
- [ ] Booking confirmation flow
- [ ] Anonymous booking support

### ⏳ **Phase 5: Admin and Driver Features**
- [ ] Admin dashboard functionality
- [ ] Driver management and invitations
- [ ] Country request system
- [ ] Signup request approval workflow

## Technical Architecture

### **Database Schema Migration**

The Convex schema (`convex/schema.ts`) has been designed to mirror your Supabase structure:

#### **Core Entities:**
- `profiles` - User profiles with roles (admin, driver, passenger)
- `countries` - Geographic organization
- `reusableCities` / `reusableStations` - Location management
- `routeTemplates` - Route definitions with cities and pricing
- `vehicles` - Driver fleet management
- `luggagePolicies` - Bag-based pricing policies
- `trips` - Scheduled trips with real-time status
- `reservations` - Passenger bookings with segment support
- `payments` - Stripe integration records
- `countryRequests` - Expansion request workflow
- `signupRequests` - Driver application system

#### **Key Improvements:**
- **Type Safety**: Full TypeScript integration
- **Real-time**: Built-in reactivity
- **No Migrations**: Schema evolution without breaking changes
- **Performance**: Optimized indexing strategy

### **Authentication Architecture**

#### **Convex Auth Features:**
- Password-based authentication
- Role-based access control (RBAC)
- Session management
- Profile creation workflow

#### **Auth Service Pattern:**
```typescript
// New hook-based pattern
const { signIn, signOut, currentUser, isAuthenticated } = useConvexAuth();

// Compared to old Supabase pattern
const { data, error } = await supabase.auth.signInWithPassword(credentials);
```

## Migration Steps

### **Phase 1: Authentication Migration**

#### **1.1 Setup Convex Providers**
Update `src/main.tsx` to use Convex:

```typescript
import { ConvexClientProvider } from "@/components/convex-provider";

// Wrap app with Convex providers
<ConvexClientProvider>
  <App />
</ConvexClientProvider>
```

#### **1.2 Update Auth Context**
Migrate `src/context/auth-context.ts` to use Convex:

```typescript
import { useConvexAuth } from "@/services/convex-auth";

// Replace Supabase auth with Convex auth
const authContext = useConvexAuth();
```

#### **1.3 Update Auth Components**
- `src/components/auth-provider.tsx` - Use Convex auth state
- `src/pages/auth.tsx` - Update forms to use new auth service
- `src/components/protected-route.tsx` - Use Convex authentication

#### **1.4 Environment Variables**
Add to `.env`:
```
VITE_CONVEX_URL=your_convex_deployment_url
```

### **Phase 2: Business Logic Migration**

#### **2.1 Countries and Cities**
Create Convex functions to replace:
- `src/services/countries.ts` - Country management
- Country request system
- City creation and management

#### **2.2 Route Templates**
Migrate route template management:
- Route creation and editing
- City sequence management
- Pricing configuration
- Reusable cities/stations

#### **2.3 Vehicle Management (COMPLETED - NEED CONVEX MIGRATION)**
Replace Supabase vehicle functions:
- Fleet management
- Vehicle features and status
- Default vehicle selection

#### **2.4 Luggage Policies (COMPLETED - NEED CONVEX MIGRATION)**
Migrate bag-based pricing system:
- Policy creation and management
- Fee calculation
- Default policy enforcement

### ✅ **Phase 3: Vehicle and Luggage Management Migration (COMPLETED)**

#### **3.1 Vehicle Management System Migration ✅ COMPLETED**
**Migration Accomplished:** Successfully migrated full-featured vehicle management system from Supabase to Convex:
- Multi-step vehicle creation/editing forms with tabbed interface
- Professional fleet management UI with statistics dashboard
- Automatic seat map generation based on vehicle type and capacity
- Vehicle feature selection and amenity management
- Maintenance tracking (insurance, registration, maintenance dates)
- Default vehicle management with automatic enforcement
- Vehicle status management (active, maintenance, inactive)
- Complete CRUD operations with search and filtering

**✅ Convex Implementation Completed:**
1. **Convex Schema Setup ✅**
   - ✅ Created vehicles table in Convex schema with all existing fields
   - ✅ Defined indexes for efficient queries (by_driver, by_status, by_default)
   - ✅ Set up proper field types (seatMap as object, features as array)

2. **Convex Functions Implementation ✅**
   - ✅ `createVehicle` - Vehicle creation with validation and seat map generation
   - ✅ `updateVehicle` - Vehicle updates with comprehensive field support
   - ✅ `deleteVehicle` - Safe deletion with dependency checks
   - ✅ `getDriverVehicles` - Vehicle listing with real-time updates
   - ✅ `getVehicleById` - Single vehicle retrieval
   - ✅ `setDefaultVehicle` - Default vehicle management
   - ✅ Admin functions for vehicle management across drivers

3. **Convex Service Layer ✅**
   - ✅ `convex/vehicles.ts` - Complete backend implementation with auth
   - ✅ `src/services/convex/vehicles.ts` - React hooks and utility functions
   - ✅ Vehicle utility functions (seat map generation, feature management)
   - ✅ TypeScript integration with proper type definitions

4. **Frontend Integration ✅**
   - ✅ Updated vehicle management pages to use Convex hooks
   - ✅ Migrated vehicle forms to use Convex mutations with async/await
   - ✅ Updated vehicle selection in trip creation/editing
   - ✅ Fixed authentication and field mapping issues
   - ✅ All vehicle management workflows tested and working

#### **3.2 Luggage Policy Management Migration ✅ COMPLETED**
**Migration Accomplished:** Successfully migrated bag-based luggage policy system from Supabase to Convex:
- Intuitive bag-based pricing (1 free bag + flat fee per additional bag)
- Complete CRUD operations for luggage policies
- Default policy management system
- Real-time fee calculation and policy preview
- Search and filtering capabilities
- Professional policy management interface
- Backward compatibility with weight-based policies

**✅ Convex Implementation Completed:**
1. **Convex Schema Setup ✅**
   - ✅ Created luggagePolicies table in Convex schema
   - ✅ Included bag-based pricing fields with proper validation
   - ✅ Set up proper field types and constraints
   - ✅ Defined indexes for efficient queries (by_driver, by_default)

2. **Convex Functions Implementation ✅**
   - ✅ `createLuggagePolicy` - Policy creation with validation
   - ✅ `updateLuggagePolicy` - Policy updates with fee recalculation
   - ✅ `deleteLuggagePolicy` - Safe deletion with dependency checks
   - ✅ `getDriverLuggagePolicies` - Policy listing with real-time updates
   - ✅ `getLuggagePolicyById` - Single policy retrieval
   - ✅ `setDefaultLuggagePolicy` - Default policy management
   - ✅ `calculateLuggageFeeByBags` - Fee calculation utilities
   - ✅ Admin functions for policy management

3. **Convex Service Layer ✅**
   - ✅ `convex/luggagePolicies.ts` - Complete backend implementation
   - ✅ `src/services/convex/luggage-policies.ts` - React hooks and utilities
   - ✅ Fee calculation compatibility maintained
   - ✅ Policy utility functions (validation, fee calculation)

4. **Frontend Integration ✅**
   - ✅ Updated luggage policy management pages to use Convex hooks
   - ✅ Migrated policy forms to use Convex mutations with proper error handling
   - ✅ Updated policy selection in trip creation/editing
   - ✅ Fixed TypeScript linter errors and authentication issues
   - ✅ All luggage policy workflows tested and working

#### **3.3 Integration Points Update ✅ COMPLETED**
✅ **All Integration Points Successfully Updated:**
- ✅ Trip creation/editing forms now use Convex for vehicle and policy selection
- ✅ Trip scheduling system integrates seamlessly with Convex vehicle/policy data
- ✅ Reservation system ready for Convex luggage fee calculation integration
- ✅ All cross-system references working correctly
- ✅ End-to-end workflows tested involving vehicles and luggage policies
- ✅ Real-time updates working across all related components

### ✅ **Phase 3: Trip Scheduling and Management (COMPLETED)**

#### **3.1 Trip Management ✅ COMPLETED**
**Migration Accomplished:** Successfully migrated comprehensive trip scheduling and management system from Supabase to Convex:
- ✅ Trip scheduling with interactive calendar interface
- ✅ Multi-step trip creation workflow (details → station selection)
- ✅ Station selection system for operational efficiency
- ✅ Trip status management (scheduled, in-progress, completed, cancelled)
- ✅ Real-time updates and synchronization
- ✅ Trip editing with pre-populated data and validation
- ✅ Professional trip listing with statistics dashboard
- ✅ Integration with route templates, vehicles, and luggage policies

**✅ Convex Implementation Completed:**
- ✅ `convex/trips.ts` - Complete backend implementation with comprehensive CRUD operations
- ✅ `src/services/convex/trips.ts` - React hooks and service layer integration
- ✅ Trip calendar with interactive scheduling and day summary modals
- ✅ Multi-step trip creation forms with real-time validation
- ✅ Trip management dashboard with search, filtering, and bulk operations
- ✅ Station pre-selection system integrated with route templates
- ✅ Authentication and authorization properly implemented
- ✅ TypeScript integration with proper error handling

#### **3.2 Passenger Search**
- Country-aware trip search
- Segment-based booking
- Filter and sorting

#### **3.3 Reservation Management**
- Booking workflow
- Seat selection
- Anonymous bookings
- Timeout handling

### **Phase 4: Payment Integration**

#### **4.1 Stripe Integration**
- Convex HTTP actions for Stripe webhooks
- Payment intent creation
- Payment status tracking

#### **4.2 Booking Confirmation**
- Reservation finalization
- Booking reference generation
- Email notifications (future)

### **Phase 5: Admin Features**

#### **5.1 Admin Dashboard**
- Driver management
- User role updates
- System analytics

#### **5.2 Approval Workflows**
- Signup request approval
- Country request management
- Driver invitation system

## File-by-File Migration Map

### **Auth Services**
- `src/services/auth.ts` → Use `src/services/convex-auth.ts`
- `src/services/supabase.ts` → Replace with `src/lib/convex.ts`
- `src/context/auth-context.ts` → Update to use Convex hooks
- `src/components/auth-provider.tsx` → Use Convex auth state

### **✅ Business Logic Services (COMPLETED MIGRATIONS)**
- ✅ `src/services/countries.ts` → `convex/countries.ts` + `src/services/convex/countries.ts`
- ✅ `src/services/route-templates.ts` → `convex/routeTemplates.ts` + `src/services/convex/routeTemplates.ts`
- ✅ `src/services/supabase/vehicles.ts` → `convex/vehicles.ts` + `src/services/convex/vehicles.ts`
- ✅ `src/services/supabase/luggage-policies.ts` → `convex/luggagePolicies.ts` + `src/services/convex/luggage-policies.ts`
- ✅ `src/services/trips.ts` → `convex/trips.ts` + `src/services/convex/trips.ts`

### **⏳ Remaining Migrations**
- [ ] `src/services/reservations.ts` → `convex/reservations.ts` + `src/services/convex/reservations.ts`
- [ ] `src/services/payments.ts` → `convex/payments.ts` + `src/services/convex/payments.ts`
- [ ] `src/services/trip-search.ts` → `convex/tripSearch.ts` + `src/services/convex/trip-search.ts`

## Migration Achievements

### ✅ **Core Business Logic Migration (COMPLETED - ALL MAJOR SYSTEMS)**

#### **✅ Route Template Migration (COMPLETED)**

**Convex Functions Implemented:**
- `convex/routeTemplates.ts` - Complete CRUD operations for route templates
- `convex/countries.ts` - Country management with global city creation
- `convex/citiesStations.ts` - Reusable cities and stations management
- `convex/reusableCitiesStations.ts` - Enhanced cities/stations functionality

**Service Layer Migration:**
- `src/services/convex/routeTemplates.ts` - React hooks for route template operations
- `src/services/convex/countries.ts` - Country and city management hooks
- `src/services/convex/citiesStations.ts` - Cities/stations management hooks

**Key Features Migrated:**
- ✅ Route template creation with cities and stations
- ✅ Intercity pricing configuration
- ✅ City sequence management with drag-and-drop
- ✅ Global city creation for all users
- ✅ Reusable cities and stations system
- ✅ Route template editing and deletion
- ✅ Route validation and country verification

#### **✅ Vehicle Management Migration (COMPLETED)**

**Convex Functions Implemented:**
- `convex/vehicles.ts` - Complete vehicle CRUD operations with authentication
- Vehicle creation, updating, deletion with dependency checks
- Default vehicle management and status tracking
- Admin functions for cross-driver vehicle management

**Service Layer Migration:**
- `src/services/convex/vehicles.ts` - React hooks and utility functions
- Seat map generation utilities maintained
- Vehicle feature management and validation

**Frontend Migration:**
- All vehicle management pages updated to use Convex hooks
- Vehicle forms migrated to async/await pattern with proper error handling
- Trip integration updated for vehicle selection
- Fixed authentication and TypeScript type mapping issues

**Key Features Migrated:**
- ✅ Multi-step vehicle creation/editing with tabbed interface
- ✅ Professional fleet management UI with statistics
- ✅ Automatic seat map generation based on vehicle type
- ✅ Vehicle feature selection and amenity management
- ✅ Maintenance tracking (insurance, registration, maintenance dates)
- ✅ Default vehicle management with automatic enforcement
- ✅ Vehicle status management (active, maintenance, inactive)
- ✅ Complete CRUD operations with search and filtering

#### **✅ Luggage Policy Migration (COMPLETED)**

**Convex Functions Implemented:**
- `convex/luggagePolicies.ts` - Complete luggage policy CRUD operations
- Policy creation, updating, deletion with business logic validation
- Default policy management system
- Fee calculation utilities for bag-based pricing

**Service Layer Migration:**
- `src/services/convex/luggage-policies.ts` - React hooks and calculation utilities
- Bag-based pricing model maintained
- Real-time fee calculation preserved

**Frontend Migration:**
- All luggage policy management pages updated to use Convex hooks
- Policy forms migrated with proper error handling and validation
- Trip integration updated for policy selection
- Fixed TypeScript linter errors and authentication issues

**Key Features Migrated:**
- ✅ Intuitive bag-based pricing (1 free bag + flat fee per additional bag)
- ✅ Complete CRUD operations for luggage policies
- ✅ Default policy management system
- ✅ Real-time fee calculation and policy preview
- ✅ Search and filtering capabilities
- ✅ Professional policy management interface
- ✅ Backward compatibility with weight-based policies

#### **✅ Trip Scheduling Migration (COMPLETED)**

**Convex Functions Implemented:**
- `convex/trips.ts` - Complete trip management system with comprehensive CRUD
- Trip creation with station pre-selection from route templates
- Trip status management and real-time updates
- Integration with vehicles and luggage policies

**Service Layer Migration:**
- `src/services/convex/trips.ts` - React hooks for trip operations
- Trip calendar integration maintained
- Station selection workflow preserved

**Frontend Migration:**
- Trip scheduling pages updated to use Convex hooks
- Multi-step trip creation workflow maintained
- Interactive calendar with day summary modals
- Fixed authentication and field mapping issues

**Key Features Migrated:**
- ✅ Trip scheduling with interactive calendar interface
- ✅ Multi-step trip creation workflow (details → station selection)
- ✅ Station selection system for operational efficiency
- ✅ Trip status management (scheduled, in-progress, completed, cancelled)
- ✅ Real-time updates and synchronization
- ✅ Trip editing with pre-populated data and validation
- ✅ Professional trip listing with statistics dashboard
- ✅ Integration with route templates, vehicles, and luggage policies

### **Technical Migration Achievements:**

**Authentication Updates:**
- Fixed all functions to use `auth.getUserId(ctx)` instead of `identity.email`
- Updated profile lookups to use `by_user` index instead of `by_email`
- Resolved "User profile not found" errors across all systems
- Implemented proper role-based access control (admin/driver)

**Database Schema Alignment:**
- All entities (vehicles, luggage policies, trips) stored in Convex with same structure as Supabase
- Proper indexing strategy for efficient queries
- Real-time reactivity enabled across all components
- Type safety maintained with proper TypeScript integration

**Frontend Architecture:**
- All management systems now use Convex hooks for real-time updates
- Eliminated React Query in favor of Convex's built-in reactivity
- Proper error handling and loading states implemented
- TypeScript linter errors resolved across all migrated components

## Testing Strategy

### **Phase-by-Phase Testing**
1. **Auth Testing**: Login/logout, role-based access
2. **Data Migration**: Verify all entities migrate correctly
3. **Functionality Testing**: All features work as before
4. **Performance Testing**: Real-time updates and responsiveness

### **Rollback Plan**
- Keep Supabase configuration until full migration complete
- Feature flags for gradual rollout
- Database backup before migration

## Environment Setup

### **Development**
```bash
# Install Convex CLI
npm install -g convex

# Initialize Convex in project
npx convex dev

# Set environment variables
VITE_CONVEX_URL=your_dev_deployment_url
```

### **Production**
```bash
# Deploy to Convex
npx convex deploy

# Update production environment
VITE_CONVEX_URL=your_prod_deployment_url
```

## Benefits of Migration

### **Developer Experience**
- **No More Migration Files**: Schema changes without breaking
- **Type Safety**: Full TypeScript integration
- **Real-time**: Built-in reactivity
- **Simpler API**: Unified query/mutation pattern

### **Performance**
- **Optimized Queries**: Convex query optimization
- **Real-time Updates**: Automatic cache invalidation
- **Better Indexing**: Strategic index placement

### **Reliability**
- **No Migration Conflicts**: Schema evolution, not revolution
- **Built-in Validation**: Runtime type checking
- **Error Handling**: Comprehensive error boundaries

## Next Steps

1. **Complete Auth Integration** (Current Phase)
2. **Create Core Business Logic Functions**
3. **Migrate Frontend Components**
4. **Test and Validate**
5. **Production Deployment**

## Support and Resources

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Auth Guide](https://labs.convex.dev/auth)
- [Migration Examples](https://docs.convex.dev/migration)

---

This migration plan ensures a smooth transition from Supabase to Convex while maintaining all existing functionality and improving developer experience. 