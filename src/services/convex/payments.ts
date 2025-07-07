import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// Types
export interface PaymentIntentData {
  tripId: string;
  passengerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  pickupStationId: string;
  dropoffStationId: string;
  selectedSeats: string[];
  numberOfBags: number;
  totalPrice: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  tempBookingId: string;
  paymentIntentId: string;
}

export interface PaymentStatus {
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  bookingReference?: string;
  reservationId?: string;
  error?: string;
}

export interface TempBooking {
  _id: Id<"tempBookings">;
  tripId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  pickupStationId: string;
  dropoffStationId: string;
  selectedSeats: string[];
  numberOfBags: number;
  totalPrice: number;
  bookingReference: string;
  paymentIntentId?: string;
  status: 'pending' | 'processing' | 'completed' | 'expired';
  expiresAt: number;
}

// Hook to create a payment intent
export const useCreatePaymentIntent = () => {
  return useAction(api.payments.createPaymentIntent);
};

// Hook to get temporary booking
export const useTempBooking = (tempBookingId: Id<"tempBookings"> | null) => {
  return useQuery(
    api.payments.getTempBooking,
    tempBookingId ? { tempBookingId } : "skip"
  );
};

// Hook to check payment status
export const usePaymentStatus = (tempBookingId: Id<"tempBookings"> | null) => {
  return useQuery(
    api.payments.checkPaymentStatus,
    tempBookingId ? { tempBookingId } : "skip"
  );
};

// Hook to cleanup expired bookings
export const useCleanupExpiredBookings = () => {
  return useMutation(api.payments.cleanupExpiredBookings);
};

// Hook to get reservation by temp booking ID (after payment success)
export const useReservationByTempBookingId = (tempBookingId: Id<"tempBookings"> | null) => {
  // This will be used when temp booking is deleted but we need reservation data
  return useQuery(
    api.reservations.getReservationByTempBookingId,
    tempBookingId ? { tempBookingId } : "skip"
  );
};

// Direct function to create payment intent (for use in mutations)
// export const createPaymentIntent = async (data: PaymentIntentData): Promise<PaymentIntentResponse> => {
//   throw new Error("Direct payment intent creation not yet implemented. Use the hook instead.");
// };

// // Direct function to get temporary booking
// export const getTempBooking = async (tempBookingId: string): Promise<TempBooking | null> => {
//   throw new Error("Direct temp booking retrieval not yet implemented. Use the hook instead.");
// };

// // Direct function to check payment status
// export const checkPaymentStatus = async (tempBookingId: string): Promise<PaymentStatus> => {
//   throw new Error("Direct payment status check not yet implemented. Use the hook instead.");
// };

// Utility function to format booking reference
export const formatBookingReference = (reference: string): string => {
  return reference.replace(/(.{4})/g, '$1-').slice(0, -1);
};

// Utility function to validate booking expiry
export const isBookingExpired = (expiresAt: number): boolean => {
  return expiresAt < Date.now();
};

// Utility function to get remaining time
export const getRemainingTime = (expiresAt: number): number => {
  return Math.max(0, expiresAt - Date.now());
};

// Utility function to format remaining time
export const formatRemainingTime = (expiresAt: number): string => {
  const remaining = getRemainingTime(expiresAt);
  if (remaining <= 0) return "Expired";
  
  const minutes = Math.floor(remaining / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}; 