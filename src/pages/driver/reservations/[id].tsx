import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  User,
  CheckCircle,
  XCircle,
  Target,
  Car,
  Package,
  Copy,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { 
  useReservationById, 
  useUpdateReservationStatus,
} from "@/services/convex/reservations";
import type { Id } from "convex/_generated/dataModel";

// Status badge colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'cancelled':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    case 'completed':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  }
};

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch reservation details
  const reservation = useReservationById(id as Id<"reservations">);
  const updateReservationStatus = useUpdateReservationStatus();

  const isLoading = reservation === undefined;
  const error = reservation === null;
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (status: 'confirmed' | 'cancelled' | 'completed') => {
    setIsUpdating(true);
    try {
      await updateReservationStatus({ 
        reservationId: id as Id<"reservations">, 
        status 
      });
      toast.success('Reservation status updated successfully!');
    } catch (error) {
      toast.error(`Failed to update reservation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const copyBookingReference = () => {
    if (reservation) {
      navigator.clipboard.writeText(reservation.bookingReference);
      toast.success('Booking reference copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/driver/reservations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reservations
          </Button>
        </div>
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/driver/reservations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reservations
          </Button>
        </div>
        <Card className="premium-card">
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Reservation not found</h3>
            <p className="text-muted-foreground">The reservation you're looking for doesn't exist or you don't have permission to view it.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departureDate = new Date(reservation.tripDepartureTime);
  const arrivalDate = reservation.tripArrivalTime ? new Date(reservation.tripArrivalTime) : null;
  const createdDate = new Date(reservation.createdAt);
  const updatedDate = new Date(reservation.updatedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/driver/reservations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reservations
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-heading">Reservation Details</h1>
            <p className="text-muted-foreground">{reservation.bookingReference}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {reservation.status === 'pending' && (
            <>
              <Button
                onClick={() => handleStatusUpdate('confirmed')}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isUpdating}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Reservation
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('cancelled')}
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={isUpdating}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
          {reservation.status === 'confirmed' && (
            <Button
              onClick={() => handleStatusUpdate('completed')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isUpdating}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reservation Summary */}
          <Card className="premium-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-orange" />
                  Reservation Summary
                </CardTitle>
                <Badge className={getStatusColor(reservation.status)}>
                  {reservation.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{reservation.bookingReference}</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={copyBookingReference}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seats Reserved</p>
                  <p className="font-medium flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {reservation.seatsReserved}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Price</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    ${reservation.totalPrice}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booked On</p>
                  <p className="font-medium">{createdDate.toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Information */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-orange" />
                Trip Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Route</p>
                <p className="font-medium">{reservation.routeTemplateName}</p>
              </div>

              {/* Journey Segment */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-3">Passenger Journey Segment</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-700">Pickup Location</p>
                    <p className="font-medium text-blue-900">{reservation.pickupCityName}</p>
                    <p className="text-sm text-blue-800">{reservation.pickupStationName}</p>
                    <p className="text-xs text-blue-600">{reservation.pickupStationAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">Dropoff Location</p>
                    <p className="font-medium text-blue-900">{reservation.dropoffCityName}</p>
                    <p className="text-sm text-blue-800">{reservation.dropoffStationName}</p>
                    <p className="text-xs text-blue-600">{reservation.dropoffStationAddress}</p>
                  </div>
                </div>
              </div>

              {/* Trip Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Departure</p>
                  <p className="font-medium">
                    {departureDate.toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Expected Arrival</p>
                  <p className="font-medium">
                    {arrivalDate ? arrivalDate.toLocaleDateString() : 'TBD'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {arrivalDate ? arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>
              </div>

              {/* Vehicle Information */}
              {reservation.vehicleName && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="font-medium flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    {reservation.vehicleName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Passenger Information */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-brand-orange" />
                Passenger Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{reservation.passengerName}</p>
                  <p className="text-sm text-muted-foreground">Passenger</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{reservation.passengerEmail}</span>
                </div>
                {reservation.passengerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{reservation.passengerPhone}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t">
                <Button variant="outline" className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Passenger
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-orange" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-orange mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Reservation {reservation.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {updatedDate.toLocaleDateString()} at {updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-300 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Reservation created</p>
                    <p className="text-xs text-muted-foreground">
                      {createdDate.toLocaleDateString()} at {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={`/driver/trips/${reservation.tripId}`}>
                <Button variant="outline" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Trip Details
                </Button>
              </Link>
              <Button variant="outline" className="w-full">
                <Package className="w-4 h-4 mr-2" />
                Manage Luggage
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 