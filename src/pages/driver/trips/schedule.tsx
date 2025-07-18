import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePickerField } from "@/components/ui/datetime-picker";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Car, 
  Package, 
  ArrowLeft, 
  Save, 
  AlertCircle,
  Check,
  Route,
  Users
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDriverVehicles } from "@/services/convex/vehicles";
import { useDriverLuggagePolicies } from "@/services/convex/luggage-policies";
import { createTrip, type TripFormData } from "@/services/convex/trips";
import { toast } from "sonner";
import { useDriverRouteTemplates, type RouteTemplate } from "@/services/convex/routeTemplates";

// Form validation schema
const tripFormSchema = z.object({
  routeTemplateId: z.string().min(1, "Please select a route template"),
  vehicleId: z.string().min(1, "Please select a vehicle"),
  luggagePolicyId: z.string().optional(),
  departureTime: z.string().min(1, "Please set departure time"),
  arrivalTime: z.string().min(1, "Please set arrival time"),
}).refine((data) => {
  const departure = new Date(data.departureTime);
  const arrival = new Date(data.arrivalTime);
  return arrival > departure;
}, {
  message: "Arrival time must be after departure time",
  path: ["arrivalTime"]
});

type TripFormFields = z.infer<typeof tripFormSchema>;

// Station selection component
const StationSelector = ({ 
  routeTemplate, 
  selectedStations, 
  onStationToggle 
}: {
  routeTemplate: RouteTemplate;
  selectedStations: Set<string>;
  onStationToggle: (stationId: string) => void;
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Select Stations to Serve</h3>
        <p className="text-sm text-muted-foreground">
          Choose which stations you'll stop at for this trip. Passengers can board/exit at selected stations.
        </p>
      </div>

      <div className="space-y-6">
        {routeTemplate.cities.map((city, cityIndex) => (
          <Card key={city.cityName} className="premium-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                  {cityIndex + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{city.cityName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {city.stations?.length || 0} available stations
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {city.stations?.map((station) => (
                <div
                  key={station.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedStations.has(station.id!)
                      ? 'border-brand-orange bg-brand-orange/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => onStationToggle(station.id!)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-5 h-5 rounded border-2 ${
                      selectedStations.has(station.id!)
                        ? 'border-brand-orange bg-brand-orange text-white'
                        : 'border-muted-foreground'
                    }`}>
                      {selectedStations.has(station.id!) && (
                        <Check className="w-3 h-3" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{station.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{station.address}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default function ScheduleTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedRouteId = searchParams.get('route');
  
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<'details' | 'stations'>('details');

  const form = useForm<TripFormFields>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      routeTemplateId: preselectedRouteId || '',
      vehicleId: '',
      luggagePolicyId: '',
      departureTime: '',
      arrivalTime: '',
    },
  });

  // Fetch route templates
  const routeTemplates = useDriverRouteTemplates();
  const loadingRoutes = routeTemplates === undefined;

  // Fetch vehicles
  const vehicles = useDriverVehicles();
  const loadingVehicles = vehicles === undefined;

  // Fetch luggage policies
  const luggagePolicies = useDriverLuggagePolicies();
  const loadingPolicies = luggagePolicies === undefined;

  // Watch form values for reactivity
  const routeTemplateId = form.watch('routeTemplateId');
  const vehicleId = form.watch('vehicleId');
  const departureTime = form.watch('departureTime');
  const arrivalTime = form.watch('arrivalTime');

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
      toast.success('Trip scheduled successfully!');
      navigate('/driver/trips');
    },
    onError: (error) => {
      toast.error(`Failed to schedule trip: ${error.message}`);
    },
  });

  const selectedRouteTemplate = useMemo(() => 
    (routeTemplates || []).find((route) => route.id === routeTemplateId),
    [routeTemplates, routeTemplateId]
  );

  const selectedVehicle = useMemo(() => 
    vehicles?.find((vehicle) => vehicle._id === vehicleId),
    [vehicles, vehicleId]
  );

  const canProceedToStations = useMemo(() => {
    return routeTemplateId && 
           routeTemplateId.trim() !== '' && 
           vehicleId && 
           vehicleId.trim() !== '' && 
           departureTime && 
           departureTime.trim() !== '' && 
           arrivalTime && 
           arrivalTime.trim() !== '';
  }, [routeTemplateId, vehicleId, departureTime, arrivalTime]);

  const handleStationToggle = (stationId: string) => {
    const newSelectedStations = new Set(selectedStations);
    if (newSelectedStations.has(stationId)) {
      newSelectedStations.delete(stationId);
    } else {
      newSelectedStations.add(stationId);
    }
    setSelectedStations(newSelectedStations);
  };

  const onSubmit = (data: TripFormFields) => {
    if (selectedStations.size === 0) {
      toast.error('Please select at least one station for the trip');
      return;
    }

    if (!selectedRouteTemplate) {
      toast.error('Selected route template not found');
      return;
    }

    // Build selected stations data
    const selectedStationsData = Array.from(selectedStations).map((stationId) => {
      // Find station and its city
      for (const city of selectedRouteTemplate.cities) {
        const station = city.stations?.find(s => s.id === stationId);
        if (station) {
          return {
            routeTemplateCityId: city.id || city.cityName, // Use city ID if available, fallback to city name
            routeTemplateStationId: station.id,
            cityName: city.cityName,
            sequenceOrder: city.sequenceOrder,
            isPickupPoint: true,
            isDropoffPoint: true,
          };
        }
      }
      return null;
    }).filter(Boolean) as unknown as TripFormData['selectedStations'];

    const tripData: TripFormData = {
      routeTemplateId: data.routeTemplateId,
      vehicleId: data.vehicleId,
      luggagePolicyId: data.luggagePolicyId || null,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      selectedStations: selectedStationsData,
    };

    createTripMutation.mutate(tripData);
  };

  const isLoading = loadingRoutes || loadingVehicles || loadingPolicies;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 animate-pulse text-brand-orange" />
            <span className="text-lg text-muted-foreground">Loading trip scheduling form...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/driver/trips" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Trips
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Schedule New Trip
          </h1>
          <p className="text-muted-foreground">
            Create a scheduled trip from one of your route templates
          </p>
        </div>
      </div>

      <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as typeof currentStep)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Trip Details
          </TabsTrigger>
          <TabsTrigger 
            value="stations" 
            disabled={!canProceedToStations}
            className="flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Station Selection
          </TabsTrigger>
        </TabsList>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <TabsContent value="details" className="space-y-6">
            {/* Route Template Selection */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5" />
                  Select Route Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="routeTemplateId">Route Template</Label>
                  <Select
                    value={form.watch('routeTemplateId')}
                    onValueChange={(value) => form.setValue('routeTemplateId', value)}
                  >
                    <SelectTrigger className="w-full h-12 px-3 bg-background">
                      <SelectValue placeholder="Select a route template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(routeTemplates || []).map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.name} ({route.cities.map(c => c.cityName).join(' → ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.routeTemplateId && (
                    <p className="text-sm text-red-600">{form.formState.errors.routeTemplateId.message}</p>
                  )}
                </div>

                {selectedRouteTemplate && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold mb-2">Route Preview</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedRouteTemplate.cities.map(c => c.cityName).join(' → ')}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{selectedRouteTemplate.estimatedDuration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedRouteTemplate.cities.reduce((total, city) => total + (city.stations?.length || 0), 0)} total stations</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle and Policy Selection */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Select Vehicle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleId">Vehicle</Label>
                    <Select
                      value={form.watch('vehicleId')}
                      onValueChange={(value) => form.setValue('vehicleId', value)}
                    >
                      <SelectTrigger className="w-full h-12 px-3 bg-background">
                        <SelectValue placeholder="Select a vehicle..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles
                          .filter(v => v.status === 'active')
                          .map((vehicle) => (
                          <SelectItem key={vehicle._id} value={vehicle._id}>
                            {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.capacity} seats
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.vehicleId && (
                      <p className="text-sm text-red-600">{form.formState.errors.vehicleId.message}</p>
                    )}
                  </div>

                  {selectedVehicle && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedVehicle.capacity} passenger capacity</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Luggage Policy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="luggagePolicyId">Luggage Policy (Optional)</Label>
                    <Select
                      value={form.watch('luggagePolicyId') || undefined}
                      onValueChange={(value) => form.setValue('luggagePolicyId', value === 'none' ? undefined : value)}
                    >
                      <SelectTrigger className="w-full h-12 px-3 bg-background">
                        <SelectValue placeholder="No specific policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific policy</SelectItem>
                        {luggagePolicies.map((policy) => (
                          <SelectItem key={policy._id} value={policy._id}>
                            {policy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Time Selection */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Schedule Times
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="departureTime">Departure Time</Label>
                    <DateTimePickerField
                      value={form.watch('departureTime')}
                      onChange={(date) => {
                        form.setValue('departureTime', date.toISOString());
                        form.trigger('departureTime');
                      }}
                      placeholder="Select departure time"
                      minDate={new Date()}
                    />
                    {form.formState.errors.departureTime && (
                      <p className="text-sm text-red-600">{form.formState.errors.departureTime.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arrivalTime">Arrival Time</Label>
                    <DateTimePickerField
                      value={form.watch('arrivalTime')}
                      onChange={(date) => {
                        form.setValue('arrivalTime', date.toISOString());
                        form.trigger('arrivalTime');
                      }}
                      placeholder="Select arrival time"
                      minDate={departureTime ? new Date(departureTime) : new Date()}
                    />
                    {form.formState.errors.arrivalTime && (
                      <p className="text-sm text-red-600">{form.formState.errors.arrivalTime.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setCurrentStep('stations')}
                disabled={!canProceedToStations}
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                Next: Select Stations
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="stations" className="space-y-6">
            {selectedRouteTemplate ? (
              <StationSelector
                routeTemplate={selectedRouteTemplate}
                selectedStations={selectedStations}
                onStationToggle={handleStationToggle}
              />
            ) : (
              <Card className="premium-card">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                    No Route Selected
                  </h3>
                  <p className="text-muted-foreground">
                    Please go back and select a route template first.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('details')}
              >
                Back to Details
              </Button>
              <Button
                type="submit"
                disabled={selectedStations.size === 0 || createTripMutation.isPending}
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                {createTripMutation.isPending ? (
                  <>
                    <Calendar className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Schedule Trip ({selectedStations.size} stations)
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
} 