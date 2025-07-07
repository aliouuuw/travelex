# TravelEx Platform - Project Context & Architecture

##  **Project Overview**

**TravelEx** is a comprehensive transportation platform that connects professional drivers with passengers for intercity travel. The platform provides a complete solution for route management, vehicle fleet administration, booking processing, and payment handling.

** MAJOR MILESTONE:** The platform has been **FULLY MIGRATED** from Supabase to Convex, achieving complete real-time functionality with enhanced performance, security, and user experience.

## 🏗️ **Technical Architecture**

### **Frontend Stack:**
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS v4 with custom design system
- **UI Components:** Radix UI primitives with custom styling
- **State Management:** Convex (real-time, no additional state libraries needed)
- **Routing:** React Router v7
- **Forms:** React Hook Form with Zod validation
- **Icons:** Lucide React
- **Date Handling:** date-fns

### **Backend Stack:**
- **Database & Backend:** Convex (fully migrated from Supabase)
- **Authentication:** Convex Auth with password provider
- **Real-time:** Built-in Convex reactivity
- **File Storage:** Convex file storage
- **Email Service:** Resend
- **Payment Processing:** Stripe with webhook integration

### **Development Tools:**
- **Package Manager:** Bun
- **Build Tool:** Vite
- **Linting:** ESLint with TypeScript
- **Type Checking:** TypeScript strict mode
- **Deployment:** Vercel

## 🎭 **User Roles & Permissions**

### **1. Admin Users**
- **Platform Management:** User approval, country expansion requests
- **Driver Management:** Approve driver signups, manage driver accounts
- **System Oversight:** Monitor platform activity and performance
- **Access:** Full administrative dashboard with comprehensive controls

### **2. Driver Users**
- **Fleet Management:** Register and manage multiple vehicles
- **Route Templates:** Create and manage reusable route configurations
- **Trip Scheduling:** Schedule trips with calendar interface
- **Reservation Management:** View and manage passenger bookings
- **Luggage Policies:** Configure bag-based pricing policies
- **Access:** Professional driver dashboard with real-time updates

### **3. Passenger Users**
- **Trip Search:** Find available trips between cities
- **Booking:** Reserve seats with luggage options
- **Payment:** Secure payment processing with Stripe
- **Access:** Public booking interface (no registration required)

## 🚀 **Core Features**

### **Driver Management System**
- **Multi-step vehicle registration** with comprehensive details
- **Automatic seat map generation** based on vehicle specifications
- **Fleet statistics dashboard** with performance metrics
- **Default vehicle management** with automatic enforcement

### **Route Template System**
- **Interactive route builder** with city sequence management
- **Station management** with pickup/dropoff locations
- **Pricing configuration** with automatic calculations
- **Reusable templates** for efficient trip scheduling

### **Trip Scheduling & Management**
- **Calendar interface** with click-to-schedule functionality
- **Batch scheduling** for recurring trips
- **Real-time updates** across all components
- **Status management** (scheduled, in-progress, completed, cancelled)

### **Luggage Policy Management**
- **Bag-based pricing model** (1 free bag + flat fee per additional bag)
- **Real-time fee calculation** and policy preview
- **Default policy management** system
- **Backward compatibility** with weight-based policies

### **Payment & Booking System**
- **Anonymous booking flow** with 30-minute expiry windows
- **Stripe integration** with secure payment processing
- **Webhook handling** for payment confirmation
- **Real-time reservation tracking** for drivers

### **Location Management**
- **Global country-city hierarchy** with controlled expansion
- **City creation workflow** with country association
- **Country expansion requests** with admin approval system
- **Reusable cities and stations** for efficiency

## 🎨 **Design System**

### **Brand Colors:**
- **Primary Orange:** `#fb8346` (TravelEx Orange)
- **Primary Blue:** `#0a2137` (TravelEx Dark Blue)
- **Extended Palette:** 10-step color scales for both primary colors

### **Typography:**
- **Headings:** DM Sans (Bold, Medium)
- **Body:** Inter (Regular, Medium, Bold)
- **Custom Font Classes:** `font-heading` for brand consistency

### **Component Library:**
- **Custom UI Components:** Built on Radix UI primitives
- **Premium Styling:** Enhanced with custom design system
- **Responsive Design:** Mobile-first approach with Tailwind CSS
- **Accessibility:** WCAG compliant with proper ARIA labels

## 🔧 **Technical Implementation**

### **Real-time Architecture:**
- **Convex Reactivity:** Automatic updates across all components
- **Optimistic Updates:** Immediate UI feedback for better UX
- **Error Handling:** Comprehensive error boundaries and user feedback
- **Loading States:** Smooth loading experiences throughout

### **Type Safety:**
- **Full TypeScript:** Strict mode with comprehensive type definitions
- **Convex Integration:** Automatic type generation from schema
- **Runtime Validation:** Zod schemas for form validation
- **API Contracts:** Type-safe service layer with proper error handling

### **Performance Optimization:**
- **Code Splitting:** Route-based lazy loading
- **Bundle Optimization:** Removed unused dependencies (Supabase, Zustand, TanStack Query)
- **Caching Strategy:** Convex built-in optimization
- **Image Optimization:** Optimized assets with proper formats

## 📊 **Database Schema**

### **Core Tables:**
- **`profiles`** - User profiles with role-based access
- **`vehicles`** - Driver vehicle fleet with detailed specifications
- **`routeTemplates`** - Reusable route configurations
- **`trips`** - Scheduled trips with station assignments
- **`luggagePolicies`** - Bag-based pricing policies
- **`countries`** - Global location hierarchy
- **`cities`** - City management with country association
- **`stations`** - Pickup/dropoff locations within cities
- **`payments`** - Stripe payment records
- **`tempBookings`** - Temporary bookings with expiry
- **`reservations`** - Confirmed passenger bookings
- **`bookedSeats`** - Seat assignment tracking

### **Relationships:**
- **Driver → Vehicles:** One-to-many relationship
- **Route Templates → Cities:** Many-to-many with sequence
- **Trips → Route Templates:** Many-to-one relationship
- **Reservations → Trips:** Many-to-one relationship
- **Booked Seats → Reservations:** One-to-many relationship

## 🚀 **Deployment & Infrastructure**

### **Production Environment:**
- **Frontend:** Vercel with automatic deployments
- **Backend:** Convex cloud with global edge deployment
- **Database:** Convex with automatic scaling
- **CDN:** Vercel Edge Network for global performance

### **Development Workflow:**
- **Local Development:** Convex dev environment
- **Type Safety:** Real-time TypeScript validation
- **Hot Reloading:** Instant feedback during development
- **Error Tracking:** Comprehensive error monitoring

## 🎯 **Business Model**

### **Revenue Streams:**
- **Commission-based:** Percentage of each booking
- **Premium Features:** Advanced driver tools and analytics
- **Platform Fees:** Transaction processing fees

### **Target Markets:**
- **Primary:** Intercity transportation in Canada
- **Secondary:** Regional transportation networks
- **Future:** International expansion with localized features

##  **Key Achievements**

### **Technical Milestones:**
- ✅ **Complete Platform Migration:** Successfully migrated from Supabase to Convex
- ✅ **Real-time Functionality:** All features now have live updates
- ✅ **Payment Integration:** End-to-end Stripe payment processing
- ✅ **Mobile Responsive:** Optimized for all device sizes
- ✅ **Type Safety:** Comprehensive TypeScript implementation
- ✅ **Performance Optimization:** Removed unused dependencies and optimized bundle

### **User Experience:**
- ✅ **Seamless Booking Flow:** Anonymous booking with payment processing
- ✅ **Driver Dashboard:** Comprehensive management interface
- ✅ **Real-time Updates:** Instant feedback across all features
- ✅ **Professional UI:** Modern, accessible design system

### **Scalability:**
- ✅ **Convex Architecture:** Built for automatic scaling
- ✅ **Modular Design:** Easy feature additions and modifications
- ✅ **Performance Optimized:** Efficient queries and caching
- ✅ **Future-ready:** Foundation for advanced features

## 🚀 **Future Roadmap**

### **Short-term Goals:**
- **Enhanced Analytics:** Driver performance metrics and insights
- **Mobile App:** Native iOS and Android applications
- **Advanced Scheduling:** AI-powered trip optimization
- **Multi-language Support:** Internationalization for global expansion

### **Long-term Vision:**
- **AI Integration:** Predictive analytics and route optimization
- **Partner Network:** Integration with other transportation services
- **Sustainability Features:** Carbon footprint tracking and offset options
- **Advanced Security:** Biometric authentication and fraud prevention

---

**TravelEx** represents a modern, scalable approach to transportation technology, leveraging the latest web technologies to create a seamless experience for both drivers and passengers. The platform's architecture ensures reliability, performance, and future growth potential.


