import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Calendar, 
  Users, 
  DollarSign,  
  MapPin, 
  Phone, 
  Mail, 
  User,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { 
  useDriverReservations, 
  useDriverReservationStats, 
  useUpdateReservationStatus,
  type DriverReservation, 
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

// Reservation Card Component
const ReservationCard = ({ 
  reservation, 
  onStatusUpdate 
}: { 
  reservation: DriverReservation; 
  onStatusUpdate: (id: Id<"reservations">, status: 'confirmed' | 'cancelled' | 'completed') => void;
}) => {
  const departureDate = new Date(reservation.tripDepartureTime);
  const createdDate = new Date(reservation.createdAt);

  return (
    <Card className="bg-white hover:shadow-md transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-orange/10">
              <Target className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg font-heading">{reservation.bookingReference}</CardTitle>
                <Badge className={getStatusColor(reservation.status)}>
                  {reservation.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{departureDate.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{reservation.seatsReserved} seat{reservation.seatsReserved !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>₵{reservation.totalPrice}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reservation.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusUpdate(reservation._id, 'confirmed')}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusUpdate(reservation._id, 'cancelled')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
            {reservation.status === 'confirmed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusUpdate(reservation._id, 'completed')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
            <Link to={`/driver/reservations/${reservation._id}`}>
              <Button size="sm" variant="outline">
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Passenger Information */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{reservation.passengerName}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span>{reservation.passengerEmail}</span>
                </div>
                {reservation.passengerPhone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{reservation.passengerPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Booked</p>
            <p className="text-sm font-medium">{createdDate.toLocaleDateString()}</p>
          </div>
        </div>

        {/* Trip Route Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{reservation.routeTemplateName}</span>
          </div>
          
          {/* Segment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium">{reservation.pickupCityName}</p>
              <p className="text-xs text-muted-foreground">{reservation.pickupStationName}</p>
              <p className="text-xs text-gray-500">{reservation.pickupStationAddress}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dropoff</p>
              <p className="text-sm font-medium">{reservation.dropoffCityName}</p>
              <p className="text-xs text-muted-foreground">{reservation.dropoffStationName}</p>
              <p className="text-xs text-gray-500">{reservation.dropoffStationAddress}</p>
            </div>
          </div>

          {/* Trip Time Information */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Departure</p>
              <p className="text-sm font-medium">
                {departureDate.toLocaleDateString()} at {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vehicle</p>
              <p className="text-sm font-medium">{reservation.vehicleName || 'TBD'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ReservationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'passenger' | 'price'>('date');

  // Fetch reservations and stats using Convex hooks
  const reservations = useDriverReservations() || [];
  const stats = useDriverReservationStats();
  const updateReservationStatus = useUpdateReservationStatus();

  const isLoading = reservations === undefined;

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    let filtered = reservations;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((reservation: DriverReservation) =>
        reservation.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.bookingReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.routeTemplateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.pickupCityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.dropoffCityName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((reservation: DriverReservation) => reservation.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a: DriverReservation, b: DriverReservation) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.tripDepartureTime).getTime() - new Date(a.tripDepartureTime).getTime();
        case 'passenger':
          return a.passengerName.localeCompare(b.passengerName);
        case 'price':
          return b.totalPrice - a.totalPrice;
        default:
          return 0;
      }
    });

    return filtered;
  }, [reservations, searchQuery, statusFilter, sortBy]);

  const handleStatusUpdate = async (reservationId: Id<"reservations">, status: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      await updateReservationStatus({ reservationId, status });
      toast.success('Reservation status updated successfully!');
    } catch (error) {
      toast.error(`Failed to update reservation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg text-muted-foreground">Loading reservations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            My Reservations
          </h1>
          <p className="text-muted-foreground">
            Manage passenger bookings and track your reservation performance
          </p>
        </div>
        <Button variant="outline" size="sm" className="bg-brand-orange text-white hover:bg-brand-orange/80">
          <Calendar className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-white rounded-lg border border-border/40 p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.totalReservations}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Reservations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.confirmedReservations}</div>
              <div className="text-sm text-muted-foreground mt-1">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.pendingReservations}</div>
              <div className="text-sm text-muted-foreground mt-1">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.totalPassengers}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Passengers</div>
            </div>
            <div className="text-center md:col-span-3 lg:col-span-1">
              <div className="text-2xl font-bold text-foreground">₵{stats.totalRevenue}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Revenue</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search reservations, passengers, or routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value: 'date' | 'passenger' | 'price') => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="passenger">Sort by Passenger</SelectItem>
              <SelectItem value="price">Sort by Price</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reservations List */}
      <div className="space-y-4">
        {filteredReservations.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                No reservations found
              </h3>
              <p className="text-muted-foreground">
                {reservations.length === 0 
                  ? "You don't have any reservations yet. Passengers will be able to book your scheduled trips."
                  : "No reservations match your current filters. Try adjusting your search criteria."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReservations.map((reservation) => (
            <ReservationCard
              key={reservation._id}
              reservation={reservation}
              onStatusUpdate={handleStatusUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
} 