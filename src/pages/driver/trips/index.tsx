import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DollarSign,
  Grid3X3,
  List
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { 
  useDriverTrips,
  formatTripDuration,
  isUpcomingTrip,
  type Trip,
} from "@/services/convex/trips";
import { toast } from "sonner";
import EnhancedCalendarView from "@/components/trip-calendar/enhanced-calendar-view";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// Fix the status constants to match backend
const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
} as const;

// Trip with enhanced date properties for calendar display
interface CalendarTrip extends Trip {
  date: Date;
  isMultiDay: boolean;
  startDate: Date;
  endDate: Date;
}

// Trip Card Component for List View
const TripCard = ({ trip }: { trip: Trip }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const deleteTripMutation = useMutation(api.trips.deleteTrip);
  const updateTripStatusMutation = useMutation(api.trips.updateTripStatus);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        await deleteTripMutation({ tripId: trip.id as Id<"trips"> });
        toast.success('Trip deleted successfully');
      } catch (error) {
        toast.error(`Failed to delete trip: ${(error as Error).message}`);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleStatusChange = async (status: Trip['status']) => {
    setIsUpdatingStatus(true);
    try {
      await updateTripStatusMutation({ tripId: trip.id as Id<"trips">, status });
      toast.success('Trip status updated successfully');
    } catch (error) {
      toast.error(`Failed to update trip status: ${(error as Error).message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
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
    <Card className="bg-white hover:shadow-md transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg font-heading">{trip.routeTemplateName}</CardTitle>
                <Badge className={STATUS_COLORS[trip.status]}>
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
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? (
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
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
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
              onClick={() => handleStatusChange('in-progress')}
              disabled={isUpdatingStatus}
              className="flex-1 bg-brand-orange text-white hover:bg-brand-orange-600"
            >
              {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Trip'}
            </Button>
          </div>
        )}

        {trip.status === 'in-progress' && (
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdatingStatus}
              className="flex-1"
            >
              {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Trip'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleStatusChange('cancelled')}
              disabled={isUpdatingStatus}
              className="flex-1 text-red-600 hover:text-red-700"
            >
              {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Trip'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Trip Details Panel for Calendar View
const TripDetailsPanel = ({ trip }: { trip: CalendarTrip | null }) => {
  if (!trip) return null;

  const departureDate = new Date(trip.departureTime);
  const arrivalDate = new Date(trip.arrivalTime);
  const duration = formatTripDuration(trip.departureTime, trip.arrivalTime);
  
  const routePath = trip.routeTemplateName || 'Unknown Route';

  return (
    <Card className="bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">{trip.routeTemplateName}</CardTitle>
              <Badge className={STATUS_COLORS[trip.status]}>
                {trip.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/driver/trips/${trip.id}`}>
                <Eye className="w-4 h-4 mr-1" />
                View
              </Link>
            </Button>
            {trip.status === 'scheduled' && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/driver/trips/${trip.id}/edit`}>
                  <Edit className="w-4 h-4" />
                </Link>
              </Button>
            )}
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
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
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

        {/* Trip Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{trip.availableSeats}/{trip.totalSeats} seats</span>
          </div>
          {trip.vehicleName && (
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              <span>{trip.vehicleName}</span>
            </div>
          )}
          {trip.totalEarnings && trip.totalEarnings > 0 && (
            <div className="flex items-center gap-2 text-brand-orange">
              <DollarSign className="w-4 h-4" />
              <span>₵{trip.totalEarnings}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function DriverTripsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTrip, setSelectedTrip] = useState<CalendarTrip | null>(null);

  const tripsData = useDriverTrips();
  const isLoading = tripsData === undefined;
  const error = null;

  useEffect(() => {
    if (error) {
      toast.error(`Failed to load trips: ${error}`);
    }
  }, [error]);

  const calendarTrips: CalendarTrip[] = useMemo(() => {
    if (!tripsData) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return tripsData.map((trip: any) => {
      const startDate = new Date(trip.departureTime);
      const endDate = new Date(trip.arrivalTime || trip.departureTime);
      return {
        id: trip.id,
        routeTemplateId: trip.routeTemplateId,
        routeTemplateName: trip.routeTemplateName,
        vehicleId: trip.vehicleId,
        vehicleName: trip.vehicleName,
        luggagePolicyId: trip.luggagePolicyId,
        luggagePolicyName: trip.luggagePolicyName,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        totalSeats: trip.totalSeats,
        availableSeats: trip.availableSeats,
        status: trip.status,
        createdAt: trip.createdAt || new Date().toISOString(),
        updatedAt: trip.updatedAt || new Date().toISOString(),
        routeCities: trip.routeCities || [],
        tripStations: trip.tripStations || [],
        reservationsCount: trip.reservationsCount || 0,
        totalEarnings: trip.totalEarnings || 0,
        date: startDate,
        start: startDate,
        end: endDate,
        isMultiDay: startDate.toDateString() !== endDate.toDateString(),
        startDate,
        endDate,
      };
    });
  }, [tripsData]);

  const filteredTrips = useMemo(() => {
    return calendarTrips.filter(trip => {
      const matchesSearch = trip.routeTemplateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trip.routeCities && trip.routeCities.some((city) => city.cityName.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [calendarTrips, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: calendarTrips.length,
      scheduled: calendarTrips.filter((t) => t.status === 'scheduled').length,
      inProgress: calendarTrips.filter((t) => t.status === 'in-progress').length,
      completed: calendarTrips.filter((t) => t.status === 'completed').length,
      totalEarnings: calendarTrips.reduce((acc, t) => acc + (t.totalEarnings || 0), 0),
    };
  }, [calendarTrips]);

  const handleTripSelect = (trip: CalendarTrip) => {
    setSelectedTrip(trip);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setView('list'); // Switch to list view when a date is clicked
    // Optionally filter trips for this date
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
          <span className="text-lg text-muted-foreground">Loading trips...</span>
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
            My Trips
          </h1>
          <p className="text-muted-foreground">
            Manage your scheduled trips and track your journey performance
          </p>
        </div>
        <Button 
          asChild 
          className="bg-brand-orange hover:bg-brand-orange-600 text-white"
        >
          <Link to="/driver/trips/schedule" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Trip
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg border border-border/40 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Trips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.scheduled}</div>
            <div className="text-sm text-muted-foreground mt-1">Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground mt-1">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
            <div className="text-sm text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="text-center md:col-span-3 lg:col-span-1">
            <div className="text-2xl font-bold text-foreground">₵{stats.totalEarnings}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Earnings</div>
          </div>
        </div>
      </div>

      {/* View Toggle and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* View Toggle */}
        <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'calendar')}>
          <TabsList className="w-fit">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Filters (only for list view) */}
        {view === 'list' && (
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search trips by route name or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'scheduled', 'in-progress', 'completed', 'cancelled'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status as 'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled')}
                  className={statusFilter === status ? "bg-brand-orange text-white hover:bg-brand-orange-600" : ""}
                >
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content based on active view */}
      {view === 'list' ? (
        /* List View */
        <div className="space-y-4">
          {filteredTrips?.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
          
          {filteredTrips?.length === 0 && (
            <Card className="bg-white">
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
      ) : (
        /* Calendar View */
        <div className="space-y-6">
          <EnhancedCalendarView
            trips={calendarTrips || []}
            onTripSelect={(trip) => handleTripSelect(trip as CalendarTrip)}
            selectedDate={selectedDate}
            onDateSelect={handleDateChange}
          />
          
          {/* Trip Details Panel - Shows when a trip is selected */}
          {selectedTrip && (
            <TripDetailsPanel trip={selectedTrip} />
          )}
        </div>
      )}
    </div>
  );
} 