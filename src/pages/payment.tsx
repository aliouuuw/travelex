import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Users,
  Package,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { useRoundTripBookingData } from "@/services/convex/payments";
import { useTripForBooking } from "@/services/convex/tripSearch";
import type { Id } from "../../convex/_generated/dataModel";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const getStripe = async () => {
  return await stripePromise;
};

// Payment Form Component (inside Elements provider)
const PaymentForm = ({ 
  totalPrice, 
  onPaymentSuccess 
}: { 
  totalPrice: number; 
  onPaymentSuccess: (bookingReference: string) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
              const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/booking-success`,
          },
          redirect: 'if_required',
        });

              if (error) {
          setPaymentError(error.message || 'Payment failed');
          toast.error(error.message || 'Payment failed');
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          // Payment succeeded
          toast.success('Payment successful! Processing your booking...');
          onPaymentSuccess(paymentIntent.id);
        }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPaymentError(errorMessage || 'Payment processing failed');
      toast.error(errorMessage || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Details</h3>
        <div className="p-4 border rounded-lg">
          <PaymentElement 
            options={{
              layout: "tabs",
              paymentMethodOrder: ['card', 'apple_pay', 'google_pay']
            }}
          />
        </div>
      </div>

      {paymentError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Payment Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{paymentError}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-brand-orange text-white hover:bg-brand-orange/90 py-3"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ${totalPrice}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your payment is secured by Stripe. We don't store your card details.
      </p>
    </form>
  );
};

// Main Payment Page Component
export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientSecret = searchParams.get('client_secret');

  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Use the new round trip booking data hook
  const bookingData = useRoundTripBookingData(bookingId as Id<"tempBookings"> | null);
  
  // Get trip data for both outbound and return (if applicable)
  const outboundTrip = useTripForBooking(bookingData?.outboundBooking?.tripId || "");
  const returnTrip = useTripForBooking(
    bookingData?.isRoundTrip && bookingData?.returnBooking?.tripId 
      ? bookingData.returnBooking.tripId 
      : ""
  );

  const isLoadingBooking = bookingData === undefined;
  const isLoadingTrips = 
    (outboundTrip === undefined && !!bookingData?.outboundBooking?.tripId) ||
    (bookingData?.isRoundTrip && returnTrip === undefined && !!bookingData?.returnBooking?.tripId);

  // Calculate time remaining
  useEffect(() => {
    if (!bookingData?.outboundBooking) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = bookingData.outboundBooking.expiresAt;
      const remaining = expiry - now;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        toast.error('Booking has expired. Please start over.');
        navigate('/search');
        return;
      }
      
      setTimeLeft(Math.floor(remaining / 1000));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [bookingData, navigate]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePaymentSuccess = (bookingReference: string) => {
    navigate(`/booking-success/${bookingId}?ref=${bookingReference}`);
  };

  // Loading states
  if (isLoadingBooking || isLoadingTrips) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
          <span className="text-lg text-muted-foreground">Loading payment details...</span>
        </div>
      </div>
    );
  }

  // Error states
  if (!bookingData || !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Session Invalid</h2>
            <p className="text-muted-foreground mb-4">
              The payment session could not be found or has expired. Please start your booking again.
            </p>
            <Button onClick={() => navigate('/search')}>
              Back to Search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const outboundDepartureTime = outboundTrip ? new Date(outboundTrip.departureTime) : null;
  const returnDepartureTime = returnTrip ? new Date(returnTrip.departureTime) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/search')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-heading">Complete Your Payment</h1>
            <p className="text-muted-foreground">Secure payment powered by Stripe</p>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="mb-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Time Remaining</p>
                  <p className="text-sm text-orange-700">
                    Complete payment within <span className="font-mono font-bold">{formatTime(timeLeft)}</span> to secure your booking
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-orange" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                                  <Elements stripe={getStripe()} options={{ clientSecret }}>
                    <PaymentForm
                      totalPrice={bookingData.totalPrice}
                      onPaymentSuccess={handlePaymentSuccess}
                    />
                  </Elements>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-brand-orange" />
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trip Details */}
                {outboundTrip && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-medium">{outboundTrip.routeTemplateName}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Departure</p>
                        <p className="font-medium text-sm">
                          {outboundDepartureTime && format(outboundDepartureTime, "MMM dd")}
                        </p>
                        <p className="text-sm">
                          {outboundDepartureTime && format(outboundDepartureTime, "HH:mm")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Driver</p>
                        <p className="font-medium text-sm">{outboundTrip.driverName}</p>
                        <p className="text-xs text-muted-foreground">
                          {outboundTrip.driverRating.toFixed(1)} rating
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {bookingData.isRoundTrip && returnTrip && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Return Trip</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Route</p>
                        <p className="font-medium">{returnTrip.routeTemplateName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Departure</p>
                          <p className="font-medium text-sm">
                            {returnDepartureTime && format(returnDepartureTime, "MMM dd")}
                          </p>
                          <p className="text-sm">
                            {returnDepartureTime && format(returnDepartureTime, "HH:mm")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Driver</p>
                          <p className="font-medium text-sm">{returnTrip.driverName}</p>
                          <p className="text-xs text-muted-foreground">
                            {returnTrip.driverRating.toFixed(1)} rating
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Passenger Details */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Passenger</p>
                  <p className="font-medium">{bookingData.outboundBooking?.passengerName}</p>
                  <p className="text-sm text-muted-foreground">{bookingData.outboundBooking?.passengerEmail}</p>
                </div>

                {/* Journey Details */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Journey details</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {bookingData.outboundBooking?.selectedSeats.length} seat{bookingData.outboundBooking?.selectedSeats.length > 1 ? 's' : ''}: {bookingData.outboundBooking?.selectedSeats.join(', ')}
                        {bookingData.isRoundTrip && bookingData.returnBooking && (
                          <span> + {bookingData.returnBooking.selectedSeats.length} return seat{bookingData.returnBooking.selectedSeats.length > 1 ? 's' : ''}: {bookingData.returnBooking.selectedSeats.join(', ')}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {bookingData.outboundBooking?.numberOfBags} bag{bookingData.outboundBooking?.numberOfBags > 1 ? 's' : ''}
                        {bookingData.isRoundTrip && bookingData.returnBooking && (
                          <span> + {bookingData.returnBooking.numberOfBags} return bag{bookingData.returnBooking.numberOfBags > 1 ? 's' : ''}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-brand-orange">${bookingData.totalPrice}</span>
                  </div>
                  {bookingData.isRoundTrip && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Outbound: ${bookingData.outboundBooking?.totalPrice}</span>
                        <span>Return: ${bookingData.returnBooking?.totalPrice}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 