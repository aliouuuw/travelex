import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  Download, 
  Mail, 
  MapPin, 
  Users, 
  Calendar, 
  Clock,
  Star,
  Phone,
  Loader2,
  AlertCircle,
  Home,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  useTempBooking, 
  usePaymentStatus, 
  useReservationByTempBookingId,
} from "@/services/convex/payments";
import { useTripForBooking } from "@/services/convex/tripSearch";
import { useSendBookingConfirmation } from "@/services/convex/booking-confirmation";
import type { Id } from "../../convex/_generated/dataModel";

export default function BookingSuccessPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingReference = searchParams.get('ref');

  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'confirmed' | 'failed' | 'processing'>('loading');
  const [finalBookingRef, setFinalBookingRef] = useState<string | null>(bookingReference);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Use Convex hooks instead of React Query
  const tempBooking = useTempBooking(bookingId as Id<"tempBookings"> | null);
  const paymentStatusData = usePaymentStatus(bookingId as Id<"tempBookings"> | null);
  const reservationData = useReservationByTempBookingId(bookingId as Id<"tempBookings"> | null);
  const trip = useTripForBooking(tempBooking?.tripId || reservationData?.tripId || "");
  const sendBookingConfirmation = useSendBookingConfirmation();

  // Check if queries are still loading (undefined = loading, null = loaded but empty)
  const isLoadingBooking = tempBooking === undefined;
  const isLoadingReservation = reservationData === undefined;
  const isLoadingPaymentStatus = paymentStatusData === undefined;
  const isLoadingTrip = trip === undefined && !!(tempBooking?.tripId || reservationData?.tripId);

  // Function to check payment status
  const checkBookingStatus = useCallback(async () => {
    if (!bookingId || !paymentStatusData) return;
    
    try {
      setIsRefreshing(true);
      
      if (paymentStatusData.status === 'succeeded' && paymentStatusData.bookingReference) {
        setPaymentStatus('confirmed');
        setFinalBookingRef(paymentStatusData.bookingReference);
      } else if (paymentStatusData.status === 'failed') {
        setPaymentStatus('failed');
      } else {
        if (bookingReference === 'PROCESSING') {
          setPaymentStatus('processing');
        } else {
          setPaymentStatus('confirmed');
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [bookingId, bookingReference, paymentStatusData]);

  // Poll for payment confirmation if we don't have a booking reference yet
  useEffect(() => {
    if (!bookingId) return;
    
    if (finalBookingRef && finalBookingRef !== 'PROCESSING') {
      setPaymentStatus('confirmed');
      return;
    }
    
    // Check status when paymentStatusData changes
    if (paymentStatusData) {
      checkBookingStatus();
    }
    
    let pollCount = 0;
    const maxPolls = 15;
    
    const pollInterval = setInterval(() => {
      pollCount++;
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        if (paymentStatus === 'loading') {
          setPaymentStatus('processing');
        }
        return;
      }
      
      if (paymentStatusData) {
        checkBookingStatus();
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }, [bookingId, finalBookingRef, checkBookingStatus, paymentStatus, paymentStatusData]);

  const handleDownloadTicket = () => {
    // TODO: Implement ticket download functionality
    window.print();
  };

  const handleEmailTicket = async () => {
    if (!bookingData?.passengerEmail || bookingData.passengerEmail === "Check your email for details") {
      return;
    }
    
    if (!trip || !finalBookingRef || finalBookingRef === 'PROCESSING') {
      console.error("Missing required data for email ticket");
      return;
    }
    
    setIsEmailSending(true);
    
    try {
      await sendBookingConfirmation({
        bookingId: bookingId || "",
        email: bookingData.passengerEmail,
        passengerName: bookingData.passengerName,
        bookingReference: finalBookingRef,
        trip: {
          routeTemplateName: trip.routeTemplateName || "Your Trip",
          departureTime: trip.departureTime || new Date().toISOString(),
          arrivalTime: trip.arrivalTime || new Date().toISOString(),
          driverName: trip.driverName || "Your Driver",
          driverRating: trip.driverRating || 5.0,
          vehicleInfo: trip.vehicleInfo ? {
            make: trip.vehicleInfo.make,
            model: trip.vehicleInfo.model,
            year: trip.vehicleInfo.year || new Date().getFullYear(),
          } : undefined,
        },
        bookingDetails: {
          selectedSeats: Array.isArray(bookingData.selectedSeats) ? bookingData.selectedSeats : ["--"],
          numberOfBags: bookingData.numberOfBags || 0,
          totalPrice: bookingData.totalPrice || 0,
          passengerPhone: bookingData.passengerPhone || undefined,
        },
      });
      
      // Show success message
      toast.success("Booking confirmation email sent successfully!");
      
    } catch (error) {
      console.error("Error sending booking confirmation email:", error);
      toast.error("Failed to send booking confirmation email. Please try again.");
    } finally {
      setIsEmailSending(false);
    }
  };

  // Loading states - wait for all critical queries to complete
  if (isLoadingBooking || isLoadingReservation || isLoadingPaymentStatus || isLoadingTrip || paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-brand-orange mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Processing Your Booking</h2>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment and finalize your booking...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing state (payment succeeded but booking still finalizing)
  if (paymentStatus === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Successful</h2>
            <p className="text-muted-foreground mb-6">
              Your payment has been processed successfully. We're still finalizing your booking details.
              This may take a few moments.
            </p>
            <div className="space-y-4">
              <Button
                onClick={checkBookingStatus}
                disabled={isRefreshing}
                className="bg-brand-orange hover:bg-brand-orange/90 w-full"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking Status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Booking Status
                  </>
                )}
              </Button>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  Need help?
                </span>
                <Link to="/contact" className="text-brand-orange hover:underline">
                  Contact Support
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - only show error if payment failed OR (all queries loaded but no data found)
  if (paymentStatus === 'failed' || (!tempBooking && !reservationData && !isLoadingBooking && !isLoadingReservation)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Failed</h2>
            <p className="text-muted-foreground mb-4">
              There was an issue processing your booking. Please contact support or try again.
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/search')} className="w-full bg-brand-orange hover:bg-brand-orange/90">
                Search Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departureTime = trip ? new Date(trip.departureTime || "") : null;
  const arrivalTime = trip ? new Date(trip.arrivalTime || "") : null;

  // Get booking data from either temp booking (during payment) or reservation data (after success)
  const bookingData = tempBooking || reservationData || {
    passengerName: "Booking Complete",
    passengerEmail: "Check your email for details",
    passengerPhone: "",
    selectedSeats: ["--"],
    numberOfBags: 0,
    totalPrice: 0,
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-lg">
            Your trip has been successfully booked. 
            {finalBookingRef === 'PROCESSING' 
              ? ' Your booking is being processed and you will receive confirmation shortly.' 
              : ` Reference: ${finalBookingRef}`
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Reference */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-brand-orange" />
                  Booking Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Booking Reference</p>
                    <p className="text-xl font-bold text-green-800">
                      {finalBookingRef === 'PROCESSING' ? 'Processing...' : finalBookingRef}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-xl font-bold text-green-800">
                      ₵{bookingData.totalPrice || (paymentStatusData?.status === 'succeeded' ? 'Paid' : '0')}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button onClick={handleDownloadTicket} variant="outline" className="flex-1 min-w-[200px]">
                    <Download className="w-4 h-4 mr-2" />
                    Download Ticket
                  </Button>
                  <Button 
                    onClick={handleEmailTicket} 
                    variant="outline" 
                    className="flex-1 min-w-[200px]"
                    disabled={isEmailSending || !bookingData?.passengerEmail || bookingData.passengerEmail === "Check your email for details"}
                  >
                    {isEmailSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Email Ticket
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Trip Details */}
            {trip && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-brand-orange" />
                    Trip Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Route</p>
                    <p className="font-semibold text-lg">{trip.routeTemplateName}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Departure</span>
                      </div>
                      <div className="ml-6">
                        <p className="font-semibold">
                          {departureTime && format(departureTime, "EEEE, MMMM dd, yyyy")}
                        </p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{departureTime && format(departureTime, "HH:mm")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Arrival</span>
                      </div>
                      <div className="ml-6">
                        <p className="font-semibold">
                          {arrivalTime && format(arrivalTime, "EEEE, MMMM dd, yyyy")}
                        </p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{arrivalTime && format(arrivalTime, "HH:mm")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Driver Info */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-orange/10 rounded-full flex items-center justify-center">
                        <Star className="w-5 h-5 text-brand-orange" />
                      </div>
                      <div>
                        <p className="font-semibold">{trip.driverName}</p>
                        <p className="text-sm text-muted-foreground">
                          {trip.driverRating.toFixed(1)} rating • Your driver
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  {trip.vehicleInfo && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Vehicle</p>
                      <p className="font-medium">
                        {trip.vehicleInfo.make} {trip.vehicleInfo.model} ({trip.vehicleInfo.year})
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Passenger Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-orange" />
                  Passenger Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{bookingData.passengerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{bookingData.passengerEmail}</p>
                </div>
                {bookingData.passengerPhone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{bookingData.passengerPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Seats</p>
                  <p className="font-medium">{bookingData.selectedSeats.join(', ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Luggage</p>
                  <p className="font-medium">{bookingData.numberOfBags} bag{bookingData.numberOfBags > 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Actions */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-700">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Check your email</p>
                      <p className="text-muted-foreground">
                        We've sent confirmation details to {bookingData.passengerEmail}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-700">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Arrive early</p>
                      <p className="text-muted-foreground">Be at the pickup location 15 minutes before departure</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-700">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Bring your ID</p>
                      <p className="text-muted-foreground">Have your booking reference and valid ID ready</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <Button asChild className="w-full bg-brand-orange hover:bg-brand-orange/90">
                    <Link to="/search">
                      <Home className="w-4 h-4 mr-2" />
                      Book Another Trip
                    </Link>
                  </Button>
                  
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/">
                      Go to Homepage
                    </Link>
                  </Button>
                </div>

                {/* Support Contact */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Need Help?</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      <span>Support: +1 (555) 123-4567</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      <span>help@travelex.com</span>
                    </div>
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