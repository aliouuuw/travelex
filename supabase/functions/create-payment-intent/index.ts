/// <reference types="https://deno.land/x/deno/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check environment variables first
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      throw new Error('STRIPE_SECRET_KEY environment variable is not configured');
    }
    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL environment variable');
      throw new Error('SUPABASE_URL environment variable is not configured');
    }
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not configured');
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Received request body:', JSON.stringify(requestBody));
    } catch (e) {
      console.error('Failed to parse request body:', e);
      throw new Error('Invalid request body format');
    }

    const {
      tripId,
      passengerInfo,
      pickupStationId,
      dropoffStationId,
      selectedSeats,
      numberOfBags,
      totalPrice
    } = requestBody;

    // Validate required fields
    if (!tripId) {
      throw new Error('Missing tripId');
    }
    if (!passengerInfo?.fullName) {
      throw new Error('Missing passenger name');
    }
    if (!passengerInfo?.email) {
      throw new Error('Missing passenger email');
    }
    if (!pickupStationId) {
      throw new Error('Missing pickup station');
    }
    if (!dropoffStationId) {
      throw new Error('Missing dropoff station');
    }
    if (!selectedSeats?.length) {
      throw new Error('No seats selected');
    }
    if (totalPrice <= 0) {
      throw new Error('Invalid price');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    // Create a temporary booking record
    const tempBooking = {
      trip_id: tripId,
      passenger_name: passengerInfo.fullName,
      passenger_email: passengerInfo.email,
      passenger_phone: passengerInfo.phone || '',
      pickup_station_id: pickupStationId,
      dropoff_station_id: dropoffStationId,
      selected_seats: selectedSeats,
      number_of_bags: numberOfBags || 1,
      total_price: totalPrice,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    };

    console.log('Creating temporary booking:', JSON.stringify(tempBooking));
    
    const { data: tempBookingData, error: bookingError } = await supabaseAdmin
      .from('temp_bookings')
      .insert(tempBooking)
      .select('id')
      .single();

    if (bookingError) {
      console.error('Error creating temp booking:', bookingError);
      throw new Error(`Failed to create temporary booking: ${bookingError.message}`);
    }

    // Create Stripe Payment Intent
    console.log('Creating Stripe payment intent');
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalPrice * 100), // Convert to cents
        currency: 'usd', // TODO: Make this configurable
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          tempBookingId: tempBookingData.id,
          tripId: tripId,
          passengerEmail: passengerInfo.email,
          passengerName: passengerInfo.fullName,
          seatsCount: selectedSeats.length.toString(),
        },
      });

      console.log('Payment intent created:', paymentIntent.id);

      // Update temp booking with payment intent ID
      await supabaseAdmin
        .from('temp_bookings')
        .update({ payment_intent_id: paymentIntent.id })
        .eq('id', tempBookingData.id);

      // Create payment record
      await supabaseAdmin
        .from('payments')
        .insert({
          reservation_id: null, // Will be updated after successful payment
          stripe_payment_id: paymentIntent.id,
          amount: totalPrice,
          currency: 'USD',
          status: 'pending',
        });

      return new Response(JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        tempBookingId: tempBookingData.id,
        paymentIntentId: paymentIntent.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError) {
      console.error('Stripe payment intent creation error:', stripeError);
      
      // Clean up the temporary booking if payment intent creation fails
      await supabaseAdmin
        .from('temp_bookings')
        .delete()
        .eq('id', tempBookingData.id);
        
      throw new Error(`Stripe error: ${stripeError.message}`);
    }

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to create payment intent' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}); 