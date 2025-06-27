import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Plus, 
  Search, 
  Clock, 
  MapPin, 
  Users, 
  Car, 
  Package,
  Edit,
  Trash2,
  Eye,
  Loader2,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getDriverTrips, 
  deleteTrip, 
  updateTripStatus,
  formatTripDuration,
  getStatusColor,
  isUpcomingTrip,
  type Trip 
} from "@/services/trips";
import { toast } from "sonner";

// Trip Card Component
const TripCard = ({ trip }: { trip: Trip }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
      toast.success('Trip deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete trip: ${error.message}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: Trip['status'] }) => 
      updateTripStatus(tripId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
      toast.success('Trip status updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update trip status: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      deleteMutation.mutate(trip.id);
    }
  };

  const handleStatusChange = (status: Trip['status']) => {
    statusMutation.mutate({ tripId: trip.id, status });
  };

  const departureDate = new Date(trip.departureTime);
  const arrivalDate = new Date(trip.arrivalTime);
  const duration = formatTripDuration(trip.departureTime, trip.arrivalTime);
  const isUpcoming = isUpcomingTrip(trip.departureTime);

  // Generate route path display
  const routePath = trip.routeCities
    .map(city => city.cityName)
    .join(' → ');

  return (
    <Card className="premium-card hover:shadow-premium-hover transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg font-heading">{trip.routeTemplateName}</CardTitle>
                <Badge className={getStatusColor(trip.status)}>
                  {trip.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{trip.availableSeats}/{trip.totalSeats} seats</span>
                </div>
                {trip.totalEarnings && trip.totalEarnings > 0 && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>₵{trip.totalEarnings}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/driver/trips/${trip.id}`}>
                <Eye className="w-4 h-4 mr-1" />
                View
              </Link>
            </Button>
            {isUpcoming && trip.status === 'scheduled' && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/driver/trips/${trip.id}/edit`}>
                  <Edit className="w-4 h-4" />
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Route Path */}
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span>{routePath}</span>
        </div>

        {/* Time and Date Info */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Departure</p>
            <p className="text-sm font-medium">
              {departureDate.toLocaleDateString()} at {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Arrival</p>
            <p className="text-sm font-medium">
              {arrivalDate.toLocaleDateString()} at {arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Vehicle and Luggage Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {trip.vehicleName && (
              <div className="flex items-center gap-1">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span>{trip.vehicleName}</span>
              </div>
            )}
            {trip.luggagePolicyName && (
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span>{trip.luggagePolicyName}</span>
              </div>
            )}
          </div>
          {trip.reservationsCount !== undefined && (
            <div className="text-muted-foreground">
              {trip.reservationsCount} reservation{trip.reservationsCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Status Actions */}
        {isUpcoming && trip.status === 'scheduled' && (
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleStatusChange('in_progress')}
              disabled={statusMutation.isPending}
              className="flex-1 bg-brand-dark-blue text-white hover:bg-brand-dark-blue-600"
            >
              Start Trip
            </Button>
          </div>
        )}

        {trip.status === 'in_progress' && (
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleStatusChange('completed')}
              disabled={statusMutation.isPending}
              className="flex-1"
            >
              Complete Trip
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleStatusChange('cancelled')}
              disabled={statusMutation.isPending}
              className="flex-1 text-red-600 hover:text-red-700"
            >
              Cancel Trip
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function DriverTripsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Trip['status']>('all');

  // Fetch trips from API
  const { 
    data: trips = [], 
    isLoading, 
    error, 
  } = useQuery<Trip[], Error>({
    queryKey: ['driver-trips'],
    queryFn: getDriverTrips,
    retry: 1
  });

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      toast.error(`Failed to load trips: ${error.message}`);
    }
  }, [error]);

  // Filter trips
  const filteredTrips = trips.filter((trip) => {
    const matchesSearch = trip.routeTemplateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.routeCities.some(city => city.cityName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: trips.length,
    scheduled: trips.filter((t) => t.status === 'scheduled').length,
    inProgress: trips.filter((t) => t.status === 'in_progress').length,
    completed: trips.filter((t) => t.status === 'completed').length,
    totalEarnings: trips.reduce((acc, t) => acc + (t.totalEarnings || 0), 0),
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
            <span className="text-lg text-muted-foreground">Loading trips...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            My Trips
          </h1>
          <p className="text-muted-foreground">
            Manage your scheduled trips and track your journey performance
          </p>
        </div>
        <Button 
          asChild 
          className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all"
        >
          <Link to="/driver/trips/schedule" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Trip
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-foreground">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100">
                <Users className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                <DollarSign className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-foreground">₵{stats.totalEarnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search trips by route name or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? "bg-brand-orange text-white hover:bg-brand-orange-600" : ""}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Trips List */}
      <div className="space-y-4">
        {filteredTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        
        {filteredTrips.length === 0 && (
          <Card className="premium-card">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                No trips found
              </h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === 'all' 
                  ? "Get started by scheduling your first trip" 
                  : `No ${statusFilter.replace('_', ' ')} trips found`}
              </p>
              <Button 
                asChild 
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                <Link to="/driver/trips/schedule" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule Trip
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 