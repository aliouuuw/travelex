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

### 🎯 **Phase 3: Core Business Logic Migration (IN PROGRESS)**
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
- [ ] **Vehicle and luggage policies (PENDING MIGRATION)**
  - [ ] Migrate vehicle management system from Supabase to Convex
  - [ ] Migrate luggage policy management from Supabase to Convex
  - [ ] Update integration points with trip scheduling

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

### **Phase 3: Vehicle and Luggage Management Migration**

#### **3.1 Vehicle Management System Migration**
**Current State:** Fully implemented in Supabase with comprehensive features:
- Multi-step vehicle creation/editing forms with tabbed interface
- Professional fleet management UI with statistics dashboard
- Automatic seat map generation based on vehicle type and capacity
- Vehicle feature selection and amenity management
- Maintenance tracking (insurance, registration, maintenance dates)
- Default vehicle management with automatic enforcement
- Vehicle status management (active, maintenance, inactive)
- Complete CRUD operations with search and filtering

**Migration Tasks:**
1. **Convex Schema Setup**
   - Create vehicles table in Convex schema with all existing fields
   - Define indexes for efficient queries (driver_id, status, is_default)
   - Set up proper field types (seat_map as JSON, features as array)

2. **Convex Functions Implementation**
   - `createVehicle` - Vehicle creation with validation
   - `updateVehicle` - Vehicle updates with seat map regeneration
   - `deleteVehicle` - Safe deletion with dependency checks
   - `getDriverVehicles` - Paginated vehicle listing with filters
   - `getDefaultVehicle` - Default vehicle selection logic
   - `setDefaultVehicle` - Default vehicle management
   - `getVehicleById` - Single vehicle retrieval

3. **Convex Service Layer**
   - Replace `src/services/supabase/vehicles.ts` with Convex equivalent
   - Maintain same API interface for seamless frontend integration
   - Add vehicle utility functions (seat map generation, feature management)

4. **Frontend Integration**
   - Update vehicle management pages to use Convex hooks
   - Migrate vehicle forms to use Convex mutations
   - Update vehicle selection components in trip creation
   - Test all vehicle management workflows

#### **3.2 Luggage Policy Management Migration**
**Current State:** Fully implemented in Supabase with bag-based pricing model:
- Intuitive bag-based pricing (1 free bag + flat fee per additional bag)
- Complete CRUD operations for luggage policies
- Default policy management system
- Real-time fee calculation and policy preview
- Search and filtering capabilities
- Professional policy management interface
- Backward compatibility with weight-based policies

**Migration Tasks:**
1. **Convex Schema Setup**
   - Create luggage_policies table in Convex schema
   - Include bag-based pricing fields (free_weight_kg, excess_fee_per_kg as flat fee)
   - Set up proper field types and validation rules
   - Define indexes for efficient queries

2. **Convex Functions Implementation**
   - `createLuggagePolicy` - Policy creation with validation
   - `updateLuggagePolicy` - Policy updates with fee recalculation
   - `deleteLuggagePolicy` - Safe deletion with dependency checks
   - `getDriverLuggagePolicies` - Paginated policy listing
   - `getDefaultLuggagePolicy` - Default policy selection
   - `setDefaultLuggagePolicy` - Default policy management
   - `calculateLuggageFee` - Fee calculation utilities

3. **Convex Service Layer**
   - Replace `src/services/supabase/luggage-policies.ts` with Convex equivalent
   - Maintain pricing calculation compatibility
   - Add policy utility functions (fee calculation, validation)

4. **Frontend Integration**
   - Update luggage policy management pages to use Convex hooks
   - Migrate policy forms to use Convex mutations
   - Update policy selection components in trip creation
   - Test all luggage policy workflows

#### **3.3 Integration Points Update**
After both systems are migrated:
- Update trip creation/editing forms to use Convex for vehicle and policy selection
- Update reservation system to use Convex for luggage fee calculation
- Ensure all cross-system references work correctly
- Test end-to-end workflows involving vehicles and luggage policies

### **Phase 3: Trip and Reservation System**

#### **3.1 Trip Management**
- Trip scheduling with calendar
- Station selection
- Status management
- Real-time updates

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

### **Business Logic Services**
- `src/services/countries.ts` → `convex/countries.ts`
- `src/services/route-templates.ts` → `convex/route-templates.ts`
- `src/services/supabase/vehicles.ts` → `convex/vehicles.ts` + `src/services/convex/vehicles.ts`
- `src/services/supabase/luggage-policies.ts` → `convex/luggage-policies.ts` + `src/services/convex/luggage-policies.ts`
- `src/services/trips.ts` → `convex/trips.ts`
- `src/services/reservations.ts` → `convex/reservations.ts`
- `src/services/payments.ts` → `convex/payments.ts`

## Migration Achievements

### ✅ **Route Template Migration (COMPLETED)**

**Convex Functions Implemented:**
- `convex/routeTemplates.ts` - Complete CRUD operations for route templates
- `convex/countries.ts` - Country management with global city creation
- `convex/citiesStations.ts` - Reusable cities and stations management
- `convex/reusableCitiesStations.ts` - Enhanced cities/stations functionality

**Service Layer Migration:**
- `src/services/convex/routeTemplates.ts` - React hooks for route template operations
- `src/services/convex/countries.ts` - Country and city management hooks
- `src/services/convex/citiesStations.ts` - Cities/stations management hooks

**Authentication Updates:**
- Fixed all route template functions to use `auth.getUserId(ctx)` instead of `identity.email`
- Updated profile lookups to use `by_user` index instead of `by_email`
- Resolved "User profile not found" errors in route creation

**Frontend Component Updates:**
- `src/components/shared/enhanced-city-selector.tsx` - Migrated to use Convex city creation
- `src/pages/driver/routes/edit.tsx` - Updated to use Convex route template services
- All route management pages updated to use Convex hooks

**Key Features Migrated:**
- ✅ Route template creation with cities and stations
- ✅ Intercity pricing configuration
- ✅ City sequence management with drag-and-drop
- ✅ Global city creation for all users
- ✅ Reusable cities and stations system
- ✅ Route template editing and deletion
- ✅ Route validation and country verification

**Database Schema Alignment:**
- Route templates stored in Convex with same structure as Supabase
- Cities and stations properly linked with country relationships
- Pricing data maintained with intercity fare calculations
- Authentication properly integrated with Convex Auth system

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