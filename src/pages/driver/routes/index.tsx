import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Route, Clock, DollarSign, MapPin, ArrowRight, Edit, Users, Loader2, Trash2, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDriverRouteTemplates, deleteRouteTemplate, type RouteTemplate } from "@/services/route-templates";
import { toast } from "sonner";

// Types are now imported from the service layer

// Utility function to calculate total route fare from intercity fares
const calculateTotalRouteFare = (route: RouteTemplate): number => {
  if (!route.intercityFares || route.intercityFares.length === 0) {
    return route.basePrice; // Fallback to base price if no intercity fares defined
  }

  // Find the total route fare (from first city to last city)
  if (route.cities.length >= 2) {
    const originCity = route.cities[0]?.cityName;
    const destinationCity = route.cities[route.cities.length - 1]?.cityName;
    
    // Look for direct origin-to-destination fare
    const totalFare = route.intercityFares.find(
      fare => fare.fromCity === originCity && fare.toCity === destinationCity
    );
    
    if (totalFare) {
      return totalFare.fare;
    }
    
    // If no direct fare exists, sum up segment fares
    let totalFromSegments = 0;
    for (let i = 0; i < route.cities.length - 1; i++) {
      const fromCity = route.cities[i].cityName;
      const toCity = route.cities[i + 1].cityName;
      const segmentFare = route.intercityFares.find(
        fare => fare.fromCity === fromCity && fare.toCity === toCity
      );
      if (segmentFare) {
        totalFromSegments += segmentFare.fare;
      }
    }
    
    return totalFromSegments > 0 ? totalFromSegments : route.basePrice;
  }
  
  return route.basePrice;
};

// RouteFlowChart Component for intercity route templates
const RouteFlowChart = ({ route }: { route: RouteTemplate }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
      <div className="flex items-start justify-center min-w-max pr-6 md:pr-0">
        {route.cities.map((city, cityIndex) => (
          <div key={city.cityName} className="flex items-center">
            {/* City Node */}
            <div className="flex flex-col items-center h-80">
              {/* City Header */}
              <div className={`
                flex items-center justify-center w-32 h-16 rounded-xl border-2 shadow-sm
                ${cityIndex === 0 
                  ? 'bg-green-100 border-green-300 text-green-800' 
                  : cityIndex === route.cities.length - 1
                  ? 'bg-red-100 border-red-300 text-red-800'
                  : 'bg-blue-100 border-blue-300 text-blue-800'}
              `}>
                <div className="text-center">
                  <div className="font-semibold text-sm">{city.cityName}</div>
                  <div className="text-xs opacity-75">
                    {cityIndex === 0 ? 'Origin' : cityIndex === route.cities.length - 1 ? 'Destination' : 'Stop'}
                  </div>
                </div>
              </div>
              
              {/* Available Stations - Fixed Height Container */}
              <div className="mt-4 flex flex-col h-60 w-full">
                <div className="text-xs font-medium text-gray-600 mb-2 text-center">
                  Available Stations ({city.stations.length})
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {city.stations.slice(0, 3).map((station) => (
                    <div
                      key={station.id}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-center min-w-[120px] bg-white border border-gray-300 text-gray-800"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{station.name}</span>
                      </div>
                      {station.address && (
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {station.address}
                        </div>
                      )}
                    </div>
                  ))}
                  {city.stations.length > 3 && (
                    <div className="text-xs text-gray-500 text-center pt-2">
                      +{city.stations.length - 3} more stations
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Arrow Connector with Fare */}
            {cityIndex < route.cities.length - 1 && (
              <div className="flex flex-col items-center justify-center mx-6 self-start mt-8">
                <ArrowRight className="w-8 h-8 text-gray-400" />
                {(() => {
                  const fromCity = city.cityName;
                  const toCity = route.cities[cityIndex + 1].cityName;
                  const fare = route.intercityFares?.find(
                    f => f.fromCity === fromCity && f.toCity === toCity
                  );
                  return fare ? (
                    <div className="mt-2 px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm">
                      <span className="text-xs font-medium text-gray-700">₵{fare.fare}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Pricing Summary */}
      {route.intercityFares && route.intercityFares.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Route Pricing</h4>
            <div className="flex items-center gap-1 text-brand-dark-blue font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>Total: ₵{calculateTotalRouteFare(route)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {route.intercityFares
              .filter(fare => {
                // Show segment fares (adjacent cities) and total route fare
                const isSegment = route.cities.some((city, index) => 
                  index < route.cities.length - 1 && 
                  city.cityName === fare.fromCity && 
                  route.cities[index + 1].cityName === fare.toCity
                );
                const isTotal = fare.fromCity === route.cities[0]?.cityName && 
                               fare.toCity === route.cities[route.cities.length - 1]?.cityName &&
                               route.cities.length > 2;
                return isSegment || isTotal;
              })
              .sort((a, b) => {
                // Sort: segments first, then total
                const aIsTotal = a.fromCity === route.cities[0]?.cityName && 
                                a.toCity === route.cities[route.cities.length - 1]?.cityName &&
                                route.cities.length > 2;
                const bIsTotal = b.fromCity === route.cities[0]?.cityName && 
                                b.toCity === route.cities[route.cities.length - 1]?.cityName &&
                                route.cities.length > 2;
                if (aIsTotal && !bIsTotal) return 1;
                if (!aIsTotal && bIsTotal) return -1;
                return 0;
              })
              .map((fare, index) => {
                const isTotal = fare.fromCity === route.cities[0]?.cityName && 
                               fare.toCity === route.cities[route.cities.length - 1]?.cityName &&
                               route.cities.length > 2;
                return (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs ${
                      isTotal 
                        ? 'bg-brand-dark-blue/10 border border-brand-dark-blue/20 text-brand-dark-blue font-medium' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {isTotal && <span className="font-bold">📍</span>}
                      <span>{fare.fromCity} → {fare.toCity}</span>
                      {isTotal && <span className="text-[10px] opacity-75">(Total)</span>}
                    </div>
                    <span className="font-medium">₵{fare.fare}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

// DriverRouteCard Component - Updated for intercity route templates
const DriverRouteCard = ({ route }: { route: RouteTemplate }) => {
  const queryClient = useQueryClient();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const totalRouteFare = calculateTotalRouteFare(route);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteRouteTemplate,
    onSuccess: () => {
      toast.success("Route template deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['driver-route-templates'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete route template: ${error.message}`);
    }
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${route.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(route.id);
    }
  };

  return (
    <Card className="premium-card hover:shadow-premium-hover transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Route className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg font-heading">{route.name}</CardTitle>
                <Badge className={getStatusColor(route.status)}>
                  {route.status}
                </Badge>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{route.estimatedDuration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>₵{totalRouteFare}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{route.scheduledTrips} scheduled</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/driver/trips/schedule?route=${route.id}`}>
                <Calendar className="w-4 h-4 mr-1" />
                Schedule Trip
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/driver/routes/${route.id}/edit`}>
                <Edit className="w-4 h-4" />
              </Link>
            </Button>
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
        <RouteFlowChart route={route} />
        
        {/* Driver Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{route.completedTrips}</p>
            <p className="text-xs text-muted-foreground">Completed Trips</p>
          </div>
                      <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{route.scheduledTrips}</p>
              <p className="text-xs text-muted-foreground">Scheduled Trips</p>
            </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-orange">₵{route.totalEarnings}</p>
            <p className="text-xs text-muted-foreground">Total Earnings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DriverRoutesPage() {
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'draft'>('all');

  // Fetch route templates from API
  const { 
    data: routeTemplates = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery<RouteTemplate[], Error>({
    queryKey: ['driver-route-templates'],
    queryFn: getDriverRouteTemplates,
    retry: 1
  });

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      toast.error(`Failed to load route templates: ${error.message}`);
    }
  }, [error]);

  const filteredRoutes = routeTemplates.filter((route) => 
    selectedStatus === 'all' || route.status === selectedStatus
  );

  const stats = {
    total: routeTemplates.length,
    active: routeTemplates.filter((r) => r.status === 'active').length,
    draft: routeTemplates.filter((r) => r.status === 'draft').length,
    totalEarnings: routeTemplates.reduce((acc, r) => acc + r.totalEarnings, 0),
    scheduledTrips: routeTemplates.reduce((acc, r) => acc + r.scheduledTrips, 0)
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
            <span className="text-lg text-muted-foreground">Loading route templates...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Card className="premium-card">
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="text-red-500">
                <Route className="w-12 h-12 mx-auto mb-4" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Failed to load route templates
              </h3>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <Button 
                onClick={() => refetch()}
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            My Route Templates
          </h1>
          <p className="text-muted-foreground">
            Create intercity route templates to schedule trips between cities
          </p>
        </div>
        <Button 
          asChild 
          className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all"
        >
          <Link to="/driver/routes/edit" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Route
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <Route className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Routes</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Trips</p>
                <p className="text-2xl font-bold text-foreground">{stats.scheduledTrips}</p>
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

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
                <Route className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Routes</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'draft'] as const).map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatus(status)}
            className={selectedStatus === status ? "bg-brand-orange text-white hover:bg-brand-orange-600" : ""}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <Badge variant="secondary" className="ml-2">
              {status === 'active' ? stats.active : 
               status === 'draft' ? stats.draft : stats.total}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Routes List */}
      <div className="space-y-6">
        {filteredRoutes.map((route) => (
          <DriverRouteCard key={route.id} route={route} />
        ))}
        
        {filteredRoutes.length === 0 && (
          <Card className="premium-card">
            <CardContent className="p-12 text-center">
              <Route className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                No routes found
              </h3>
              <p className="text-muted-foreground mb-4">
                {selectedStatus === 'all' 
                  ? "Get started by creating your first route" 
                  : `No ${selectedStatus} routes found`}
              </p>
              <Button 
                asChild 
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                <Link to="/driver/routes/edit" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Route
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 