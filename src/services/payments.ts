import { supabase } from './supabase';
import { loadStripe, type StripeElements, type StripePaymentElement } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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

export interface TempBooking {
  id: string;
  tripId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone?: string;
  pickupStationId: string;
  dropoffStationId: string;
  selectedSeats: string[];
  numberOfBags: number;
  totalPrice: number;
  paymentIntentId?: string;
  expiresAt: string;
  createdAt: string;
}

export interface PaymentStatus {
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  bookingReference?: string;
  reservationId?: string;
  error?: string;
}

/**
 * Create a Stripe Payment Intent for anonymous booking
 */
export const createPaymentIntent = async (data: PaymentIntentData): Promise<PaymentIntentResponse> => {
  const { data: response, error } = await supabase.functions.invoke('create-payment-intent', {
    body: data
  });

  if (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(error.message || 'Failed to create payment intent');
  }

  if (!response) {
    throw new Error('No response from payment intent creation');
  }

  return response;
};

/**
 * Get Stripe instance
 */
export const getStripe = async () => {
  return await stripePromise;
};

/**
 * Confirm payment with Stripe Elements
 */
export const confirmPayment = async (
  clientSecret: string,
  elements: StripeElements,
  paymentElement: StripePaymentElement,
  returnUrl: string
) => {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe not loaded');
  }

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: returnUrl,
    },
    redirect: 'if_required',
  });

  if (error) {
    throw new Error(error.message || 'Payment confirmation failed');
  }

  return paymentIntent;
};

/**
 * Get temporary booking details
 */
export const getTempBooking = async (tempBookingId: string): Promise<TempBooking | null> => {
  const { data, error } = await supabase
    .from('temp_bookings')
    .select('*')
    .eq('id', tempBookingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching temp booking:', error);
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    tripId: data.trip_id,
    passengerName: data.passenger_name,
    passengerEmail: data.passenger_email,
    passengerPhone: data.passenger_phone,
    pickupStationId: data.pickup_station_id,
    dropoffStationId: data.dropoff_station_id,
    selectedSeats: data.selected_seats || [],
    numberOfBags: data.number_of_bags || 1,
    totalPrice: data.total_price,
    paymentIntentId: data.payment_intent_id,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
};

/**
 * Check payment status for a temporary booking
 */
export const checkPaymentStatus = async (tempBookingId: string): Promise<PaymentStatus> => {
  // First check if temp booking still exists
  const tempBooking = await getTempBooking(tempBookingId);
  
  if (!tempBooking) {
    console.log('Booking not found, may have been processed already');
    // Check for a reservation directly using payment intent ID
    if (tempBookingId) {
      try {
        const { data } = await supabase
          .from('reservations')
          .select('id, booking_reference, status')
          .eq('booking_reference', tempBookingId)
          .maybeSingle();
          
        if (data) {
          console.log('Found reservation by booking reference:', data);
          return { 
            status: 'succeeded', 
            bookingReference: data.booking_reference,
            reservationId: data.id 
          };
        }
      } catch (err) {
        console.error('Error checking reservations:', err);
      }
    }
    
    return { status: 'failed', error: 'Booking not found or expired' };
  }

  // Check if booking has expired
  if (tempBooking && new Date(tempBooking.expiresAt) < new Date()) {
    return { status: 'failed', error: 'Booking has expired' };
  }

  console.log('Checking payment status for booking with ID:', tempBookingId);

  // Check payment status from Stripe via our backend
  if (tempBooking?.paymentIntentId) {
    console.log('Found payment intent ID:', tempBooking.paymentIntentId);
    
    try {
      const { data: payment } = await supabase
        .from('payments')
        .select(`
          status, 
          stripe_payment_id,
          reservation_id,
          reservations:reservation_id (
            id,
            booking_reference,
            status
          )
        `)
        .eq('stripe_payment_id', tempBooking.paymentIntentId)
        .single();

      console.log('Payment status data:', payment);

      if (payment) {
        if (payment.status === 'completed' && payment.reservation_id) {
          console.log('Payment completed with reservation:', payment.reservations);
          return { 
            status: 'succeeded',
            bookingReference: payment.reservations?.booking_reference,
            reservationId: payment.reservations?.id
          };
        } else if (payment.status === 'failed') {
          return { status: 'failed', error: 'Payment failed' };
        } else {
          console.log('Payment still pending, webhook may not have processed yet');
          return { status: 'pending' };
        }
      } else {
        console.log('No payment found for intent ID:', tempBooking.paymentIntentId);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  } else {
    console.log('No payment intent ID found for booking');
  }

  return { status: 'pending' };
};

/**
 * Get payment details by payment intent ID
 */
export const getPaymentByIntentId = async (paymentIntentId: string) => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      reservations:reservation_id (
        id,
        booking_reference,
        status,
        passenger_name,
        passenger_email
      )
    `)
    .eq('stripe_payment_id', paymentIntentId)
    .single();

  if (error) {
    console.error('Error fetching payment:', error);
    return null;
  }

  return data;
};

/**
 * Clean up expired temporary bookings (utility function)
 */
export const cleanupExpiredBookings = async (): Promise<void> => {
  const { error } = await supabase.rpc('cleanup_expired_temp_bookings');
  
  if (error) {
    console.error('Error cleaning up expired bookings:', error);
    throw new Error(error.message);
  }
}; 