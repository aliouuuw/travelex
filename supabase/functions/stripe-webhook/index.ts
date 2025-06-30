/// <reference types="https://deno.land/x/deno/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('Webhook received:', req.method, req.url);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response('Missing stripe-signature header', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Get environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Environment variables loaded successfully');

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase with service role (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get raw body for signature verification
    const body = await req.text();
    console.log('Request body length:', body.length);

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('Webhook signature verified successfully');
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(`Webhook signature verification failed: ${err.message}`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Processing webhook event:', event.type, event.id);

    // Handle successful payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const tempBookingId = paymentIntent.metadata.tempBookingId;

      console.log('Payment intent succeeded:', paymentIntent.id);
      console.log('Temp booking ID:', tempBookingId);

      if (!tempBookingId) {
        console.error('Missing tempBookingId in payment intent metadata');
        return new Response('Missing booking information', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Get temporary booking data
      const { data: tempBooking, error: tempBookingError } = await supabaseAdmin
        .from('temp_bookings')
        .select('*')
        .eq('id', tempBookingId)
        .single();

      if (tempBookingError || !tempBooking) {
        console.error('Temporary booking not found:', tempBookingError);
        return new Response('Booking not found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }

      console.log('Found temporary booking:', tempBooking.id);

      // Check if booking has expired
      if (new Date(tempBooking.expires_at) < new Date()) {
        console.error('Booking has expired');
        return new Response('Booking has expired', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Generate booking reference
      const bookingReference = 'TRX-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      console.log('Generated booking reference:', bookingReference);

      // Create the actual reservation
      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from('reservations')
        .insert({
          trip_id: tempBooking.trip_id,
          passenger_id: null, // No user account for anonymous booking
          pickup_station_id: tempBooking.pickup_station_id,
          dropoff_station_id: tempBooking.dropoff_station_id,
          seats_reserved: tempBooking.selected_seats.length,
          total_price: tempBooking.total_price,
          booking_reference: bookingReference,
          status: 'confirmed',
          passenger_name: tempBooking.passenger_name,
          passenger_email: tempBooking.passenger_email,
          passenger_phone: tempBooking.passenger_phone,
          number_of_bags: tempBooking.number_of_bags,
        })
        .select('id')
        .single();

      if (reservationError) {
        console.error('Error creating reservation:', reservationError);
        return new Response('Failed to create reservation', { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      console.log('Created reservation:', reservation.id);

      // Create booked seats entries
      if (tempBooking.selected_seats && tempBooking.selected_seats.length > 0) {
        const seatEntries = tempBooking.selected_seats.map((seatNumber: string) => ({
          reservation_id: reservation.id,
          seat_number: seatNumber
        }));

        const { error: seatError } = await supabaseAdmin
          .from('booked_seats')
          .insert(seatEntries);

        if (seatError) {
          console.warn('Failed to save seat selections:', seatError);
        } else {
          console.log('Created booked seats:', seatEntries.length);
        }
      }

      // Update payment record
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({
          reservation_id: reservation.id,
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('stripe_payment_id', paymentIntent.id);

      if (paymentUpdateError) {
        console.error('Error updating payment:', paymentUpdateError);
      } else {
        console.log('Updated payment status to completed');
      }

      // Update trip available seats
      const { error: tripUpdateError } = await supabaseAdmin.rpc('update_trip_available_seats', {
        trip_id: tempBooking.trip_id,
        seats_to_reserve: tempBooking.selected_seats.length
      });

      if (tripUpdateError) {
        console.warn('Failed to update trip available seats:', tripUpdateError);
      } else {
        console.log('Updated trip available seats');
      }

      // Clean up temporary booking
      const { error: deleteError } = await supabaseAdmin
        .from('temp_bookings')
        .delete()
        .eq('id', tempBookingId);

      if (deleteError) {
        console.warn('Failed to delete temporary booking:', deleteError);
      } else {
        console.log('Cleaned up temporary booking');
      }

      console.log(`Successfully processed payment for booking ${bookingReference}`);

      // TODO: Send confirmation email here
      // await sendConfirmationEmail(tempBooking, bookingReference);

    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment intent failed:', paymentIntent.id);
      
      // Update payment status to failed
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
        })
        .eq('stripe_payment_id', paymentIntent.id);

      if (paymentUpdateError) {
        console.error('Error updating failed payment:', paymentUpdateError);
      } else {
        console.log(`Updated payment status to failed for: ${paymentIntent.id}`);
      }
    } else {
      console.log('Unhandled webhook event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Webhook processing failed' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 