import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  Plus, 
  Clock, 
  MapPin, 
  Car,
  Eye,
  Edit,
  Users,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  DollarSign,
  PanelRightClose,
  PanelRightOpen
} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  getDriverTrips, 
  formatTripDuration,
  getStatusColor,
  type Trip 
} from "@/services/convex/trips";
import EnhancedCalendarView from "@/components/trip-calendar/enhanced-calendar-view";
import TripCard from "@/components/trip-calendar/trip-card";

// Calendar value type
type CalendarValue = Date | null;

// Trip with enhanced date properties for calendar display
interface CalendarTrip extends Trip {
  date: Date;
  isMultiDay: boolean;
  startDate: Date;
  endDate: Date;
}

// Calendar view type
type CalendarViewType = 'month' | 'timeline';



// Timeline Event Component
const TimelineEvent = ({ trip, onClick }: { trip: CalendarTrip; onClick: () => void }) => {
  return (
                      <TripCard
      trip={trip}
      onTripSelect={onClick}
      compact={false}
    />
  );
};

// Trip Details Modal/Sidebar Component
const TripDetailsPanel = ({ trip }: { trip: CalendarTrip | null }) => {
  if (!trip) return null;

  const departureDate = new Date(trip.departureTime);
  const arrivalDate = new Date(trip.arrivalTime);
  const duration = formatTripDuration(trip.departureTime, trip.arrivalTime);
  
  // Use route template name instead of empty routeCities
  const routePath = trip.routeTemplateName || 'Unknown Route';

  return (
    <Card className="premium-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">{trip.routeTemplateName}</CardTitle>
              <Badge className={getStatusColor(trip.status)}>
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
              <span>${trip.totalEarnings}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function TripCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<CalendarValue>(new Date());
  const [selectedTrip, setSelectedTrip] = useState<CalendarTrip | null>(null);
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Fetch trips from API
  const { 
    data: trips = [], 
    isLoading, 
  } = useQuery<Trip[], Error>({
    queryKey: ['driver-trips'],
    queryFn: getDriverTrips,
    retry: 1
  });

  // Transform trips for calendar display
  const calendarTrips: CalendarTrip[] = useMemo(() => {
    return trips.map(trip => {
      const startDate = new Date(trip.departureTime);
      const endDate = new Date(trip.arrivalTime);
      const isMultiDay = startDate.toDateString() !== endDate.toDateString();
      
      return {
        ...trip,
        date: startDate,
        isMultiDay,
        startDate,
        endDate,
      };
    });
  }, [trips]);

  // Group trips by date for calendar display
  const tripsByDate = useMemo(() => {
    const grouped: Record<string, CalendarTrip[]> = {};
    
    calendarTrips.forEach(trip => {
      const dateKey = trip.startDate.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(trip);
    });
    
    return grouped;
  }, [calendarTrips]);

  // Get trips for selected date
  const selectedDateTrips = useMemo(() => {
    if (!selectedDate || Array.isArray(selectedDate)) return [];
    const dateKey = selectedDate.toDateString();
    return tripsByDate[dateKey] || [];
  }, [selectedDate, tripsByDate]);

  // Get trips for current month (timeline view)
  const currentMonthTrips = useMemo(() => {
    return calendarTrips
      .filter(trip => {
        const tripMonth = trip.startDate.getMonth();
        const tripYear = trip.startDate.getFullYear();
        return tripMonth === currentMonth.getMonth() && tripYear === currentMonth.getFullYear();
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [calendarTrips, currentMonth]);

  // Handle trip selection
  const handleTripSelect = (trip: CalendarTrip) => {
    setSelectedTrip(trip);
  };

  // Navigation handlers for timeline view
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Keyboard shortcut to toggle sidebar (Ctrl/Cmd + B)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 animate-pulse text-brand-orange" />
            <span className="text-lg text-muted-foreground">Loading calendar...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/driver/trips" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Trips
              </Link>
            </Button>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">
                Trip Calendar
              </h1>
              <p className="text-muted-foreground">
                Visual schedule management for your trips
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewType} onValueChange={(value) => setViewType(value as CalendarViewType)}>
              <TabsList>
                <TabsTrigger value="month" className="flex items-center gap-2">
                  <Grid className="w-4 h-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="bg-brand-dark-blue hover:bg-brand-dark-blue-600 text-white shadow-brand hover:shadow-brand-hover transition-all flex items-center gap-2"
              title={`${sidebarCollapsed ? 'Show' : 'Hide'} Panel (Ctrl+B)`}
            >
              {sidebarCollapsed ? (
                <>
                  <PanelRightOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Show Panel</span>
                </>
              ) : (
                <>
                  <PanelRightClose className="w-4 h-4" />
                  <span className="hidden sm:inline">Hide Panel</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className={`grid gap-6 transition-all duration-300 ${sidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
          {/* Calendar/Timeline View */}
          <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
            <Tabs value={viewType} onValueChange={(value) => setViewType(value as CalendarViewType)}>
              <TabsContent value="month">
                <EnhancedCalendarView
                  trips={calendarTrips}
                  onTripSelect={handleTripSelect}
                  selectedDate={selectedDate as Date | null}
                  onDateSelect={(date) => setSelectedDate(date)}
                />
              </TabsContent>

              <TabsContent value="timeline">
                <Card className="premium-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <List className="w-5 h-5" />
                        Timeline View
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[120px] text-center">
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <Button variant="outline" size="sm" onClick={handleNextMonth}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                    {currentMonthTrips.length > 0 ? (
                      currentMonthTrips.map((trip) => (
                        <TimelineEvent
                          key={trip.id}
                          trip={trip}
                          onClick={() => handleTripSelect(trip)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                          No trips this month
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Schedule your first trip for {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Trip Details Sidebar */}
          {!sidebarCollapsed && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {/* Selected Date Trips (Month View) */}
            {viewType === 'month' && (
              <Card className="premium-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">
                    {selectedDate && !Array.isArray(selectedDate) 
                      ? selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'Select a date'
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedDateTrips.length > 0 ? (
                    selectedDateTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className="p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleTripSelect(trip)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{trip.routeTemplateName}</h4>
                          <Badge className={getStatusColor(trip.status)} style={{ fontSize: '10px' }}>
                            {trip.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No trips scheduled for this date
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Trip Details Panel */}
            {selectedTrip && (
              <TripDetailsPanel trip={selectedTrip} />
            )}

            {/* Quick Stats */}
            <Card className="premium-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Trips</span>
                  <span className="font-semibold">{trips.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="font-semibold">{currentMonthTrips.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-semibold text-green-600">
                    {trips.filter(t => t.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming</span>
                  <span className="font-semibold text-blue-600">
                    {trips.filter(t => t.status === 'scheduled').length}
                  </span>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>

        {/* Floating Toggle Button (when sidebar is collapsed) */}
        {sidebarCollapsed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarCollapsed(false)}
            className="fixed bg-brand-dark-blue hover:bg-brand-dark-blue-600 text-white shadow-brand hover:shadow-brand-hover transition-all bottom-6 right-6 z-50 shadow-lg border-2 animate-in fade-in slide-in-from-bottom duration-300"
            title="Show Panel (Ctrl+B)"
          >
            <PanelRightOpen className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Show Panel</span>
          </Button>
        )}
      </div>
  );
}