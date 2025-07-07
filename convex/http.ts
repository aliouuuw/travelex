import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

auth.addHttpRoutes(http);

// Stripe webhook handler
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;

    try {
      // Get the raw body
      const body = await request.text();
      
      // Initialize Stripe
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      // Verify the webhook signature
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return new Response(`Webhook signature verification failed: ${error}`, { status: 400 });
    }

    console.log("Received Stripe webhook event:", event.type);

    try {
      // Handle the event
      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          console.log("Payment succeeded:", paymentIntent.id);
          console.log("Metadata:", paymentIntent.metadata);

          // Extract metadata
          const tempBookingId = paymentIntent.metadata.tempBookingId;
          
          if (!tempBookingId) {
            console.error("No tempBookingId in payment intent metadata");
            return new Response("Missing tempBookingId in metadata", { status: 400 });
          }

          // Process the successful payment
          try {
            const result = await ctx.runAction(api.payments.processSuccessfulPayment, {
              paymentIntentId: paymentIntent.id,
              tempBookingId: tempBookingId,
            });

            console.log("Payment processed successfully:", result);
            
            // TODO: Send confirmation email here if needed
            // await ctx.runAction(api.email.sendBookingConfirmation, {
            //   reservationId: result.reservationId,
            //   passengerEmail: paymentIntent.metadata.passengerEmail,
            // });

          } catch (error) {
            console.error("Error processing successful payment:", error);
            return new Response(`Error processing payment: ${error}`, { status: 500 });
          }
          
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          console.log("Payment failed:", paymentIntent.id);
          console.log("Failure reason:", paymentIntent.last_payment_error?.message);

          // TODO: Handle payment failure
          // Could update temp booking status or send notification
          
          break;
        }

        case "payment_intent.canceled": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          console.log("Payment canceled:", paymentIntent.id);

          // TODO: Handle payment cancellation
          // Could clean up temp booking or send notification
          
          break;
        }

        default: {
          console.log("Unhandled event type:", event.type);
          break;
        }
      }

      return new Response("Webhook received", { status: 200 });

    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response(`Webhook processing error: ${error}`, { status: 500 });
    }
  }),
});

export default http;
