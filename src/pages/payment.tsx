import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  MapPin,
  Users,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { getStripe, getTempBooking, checkPaymentStatus, type TempBooking } from "@/services/payments";
import { getTripForBooking } from "@/services/trip-search";
import { format } from "date-fns";

// Payment Form Component (inside Elements provider)
const PaymentForm = ({ 
  tempBooking, 
  onPaymentSuccess 
}: { 
  tempBooking: TempBooking; 
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
          return_url: `${window.location.origin}/booking-success/${tempBooking.id}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setPaymentError(error.message || 'Payment failed');
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded, poll for booking confirmation
        toast.success('Payment successful! Processing your booking...');
        
        // Poll for booking completion (webhook processing)
        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 2000; // 2 seconds

        const pollForCompletion = async () => {
          try {
            const status = await checkPaymentStatus(tempBooking.id);
            
            if (status.status === 'succeeded' && status.bookingReference) {
              onPaymentSuccess(status.bookingReference);
              return;
            } else if (status.status === 'failed') {
              setPaymentError(status.error || 'Booking processing failed');
              return;
            }

            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollForCompletion, pollInterval);
            } else {
              // Fallback - redirect to success page anyway
              onPaymentSuccess('PROCESSING');
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(pollForCompletion, pollInterval);
            }
          }
        };

        pollForCompletion();
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
        className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white py-3"
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
            Pay ₵{tempBooking.totalPrice}
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

  // Fetch temporary booking details
  const { data: tempBooking, isLoading: isLoadingBooking, error: bookingError } = useQuery({
    queryKey: ['temp-booking', bookingId],
    queryFn: () => getTempBooking(bookingId!),
    enabled: !!bookingId,
    refetchInterval: false,
  });

  // Fetch trip details for display
  const { data: trip, isLoading: isLoadingTrip } = useQuery({
    queryKey: ['trip-payment', tempBooking?.tripId],
    queryFn: () => getTripForBooking(tempBooking!.tripId),
    enabled: !!tempBooking?.tripId,
  });

  // Calculate time remaining
  useEffect(() => {
    if (!tempBooking) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(tempBooking.expiresAt).getTime();
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
  }, [tempBooking, navigate]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePaymentSuccess = (bookingReference: string) => {
    navigate(`/booking-success/${bookingId}?ref=${bookingReference}`);
  };

  // Loading states
  if (isLoadingBooking || isLoadingTrip) {
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
  if (bookingError || !tempBooking || !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Session Invalid</h2>
            <p className="text-muted-foreground mb-4">
              The payment session could not be found or has expired. Please start your booking again.
            </p>
            <Button onClick={() => navigate('/search')} className="bg-brand-orange hover:bg-brand-orange/90">
              Back to Search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departureTime = trip ? new Date(trip.departureTime) : null;

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
                    tempBooking={tempBooking}
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
                {trip && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-medium">{trip.routeTemplateName}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Departure</p>
                        <p className="font-medium text-sm">
                          {departureTime && format(departureTime, "MMM dd")}
                        </p>
                        <p className="text-sm">
                          {departureTime && format(departureTime, "HH:mm")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Driver</p>
                        <p className="font-medium text-sm">{trip.driverName}</p>
                        <p className="text-xs text-muted-foreground">
                          {trip.driverRating.toFixed(1)} rating
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Passenger Details */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Passenger</p>
                  <p className="font-medium">{tempBooking.passengerName}</p>
                  <p className="text-sm text-muted-foreground">{tempBooking.passengerEmail}</p>
                </div>

                {/* Journey Details */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Journey details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{tempBooking.selectedSeats.length} seat{tempBooking.selectedSeats.length > 1 ? 's' : ''}: {tempBooking.selectedSeats.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{tempBooking.numberOfBags} bag{tempBooking.numberOfBags > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-brand-orange">₵{tempBooking.totalPrice}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 