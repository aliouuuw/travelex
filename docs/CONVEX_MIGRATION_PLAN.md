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

### 🔄 **Phase 2: Frontend Auth Integration (IN PROGRESS)**
- [ ] Update main app to use Convex providers
- [ ] Migrate auth context to use Convex
- [ ] Update auth components and pages
- [ ] Test authentication flow

### ⏳ **Phase 3: Core Business Logic Migration**
- [ ] Countries and cities management
- [ ] Route templates and pricing
- [ ] Vehicle and luggage policies
- [ ] Trip scheduling and management

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

#### **2.3 Vehicle Management**
Replace Supabase vehicle functions:
- Fleet management
- Vehicle features and status
- Default vehicle selection

#### **2.4 Luggage Policies**
Migrate bag-based pricing system:
- Policy creation and management
- Fee calculation
- Default policy enforcement

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
- `src/services/vehicles.ts` → `convex/vehicles.ts`
- `src/services/luggage-policies.ts` → `convex/luggage-policies.ts`
- `src/services/trips.ts` → `convex/trips.ts`
- `src/services/reservations.ts` → `convex/reservations.ts`
- `src/services/payments.ts` → `convex/payments.ts`

### **Admin Services**
- `src/services/users.ts` → `convex/users.ts` (already created)
- `src/services/signup-requests.ts` → `convex/signup-requests.ts`

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