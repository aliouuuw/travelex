import { useState, useEffect, useMemo } from "react";
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
  Users, 
  Car, 
  Package, 
  Route,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Save
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  useTripById,
  updateTrip,
  type TripFormData 
} from "@/services/convex/trips";
import { useDriverRouteTemplates, type RouteTemplate } from "@/services/convex/routeTemplates";
import { useDriverVehicles } from "@/services/convex/vehicles";
import { useDriverLuggagePolicies } from "@/services/convex/luggage-policies";
import { toast } from "sonner";

const tripFormSchema = z.object({
  routeTemplateId: z.string().min(1, "Route template is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  luggagePolicyId: z.string().optional().nullable(),
  departureTime: z.string().min(1, "Departure time is required"),
  arrivalTime: z.string().min(1, "Arrival time is required"),
}).refine((data) => {
  const departure = new Date(data.departureTime);
  const arrival = new Date(data.arrivalTime);
  return arrival > departure;
}, {
  message: "Arrival time must be after departure time",
  path: ["arrivalTime"],
});

type TripFormFields = z.infer<typeof tripFormSchema>;

const StationSelector = ({ 
  routeTemplate, 
  selectedStations, 
  onStationToggle 
}: {
  routeTemplate: RouteTemplate;
  selectedStations: Set<string>;
  onStationToggle: (stationId: string, cityName: string, sequenceOrder: number) => void;
}) => {
  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Select Stations to Serve
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which stations along your route you'll pick up and drop off passengers
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {routeTemplate.cities.map((city, cityIndex) => (
          <div key={city.cityName} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-orange text-white text-sm font-semibold">
                {cityIndex + 1}
              </div>
              <h4 className="font-semibold text-lg">{city.cityName}</h4>
            </div>
            
            {city.stations && city.stations.length > 0 ? (
              <div className="ml-11 space-y-2">
                {city.stations.map((station) => (
                  <label
                    key={station.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStations.has(station.id!)}
                      onChange={() => onStationToggle(station.id!, city.cityName, city.sequenceOrder!)}
                      className="w-4 h-4 text-brand-orange border-border rounded focus:ring-brand-orange focus:ring-2"
                    />
                    <div className="flex-1">
                      <span className="font-medium">{station.name}</span>
                      {station.address && (
                        <p className="text-sm text-muted-foreground">{station.address}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="ml-11 p-3 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                No stations available for this city
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'details' | 'stations'>('details');
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formInitialized, setFormInitialized] = useState(false);

  const form = useForm<TripFormFields>({
    resolver: zodResolver(tripFormSchema),
    mode: 'onChange',
    defaultValues: {
      routeTemplateId: '',
      vehicleId: '',
      luggagePolicyId: undefined,
      departureTime: '',
      arrivalTime: '',
    },
  });

  // Watch form values for reactivity
  const routeTemplateId = form.watch('routeTemplateId');
  const vehicleId = form.watch('vehicleId');
  const departureTime = form.watch('departureTime');
  const arrivalTime = form.watch('arrivalTime');

  // Fetch data using Convex hooks
  const trip = useTripById(id!);
  const rawRouteTemplates = useDriverRouteTemplates();
  const routeTemplates = useMemo(() => rawRouteTemplates || [], [rawRouteTemplates]);
  const rawVehicles = useDriverVehicles();
  const vehicles = useMemo(() => rawVehicles || [], [rawVehicles]);
  const rawLuggagePolicies = useDriverLuggagePolicies();
  const luggagePolicies = useMemo(() => rawLuggagePolicies || [], [rawLuggagePolicies]);


  const selectedRouteTemplate = useMemo(() => 
    routeTemplates.find((route) => route.id === routeTemplateId),
    [routeTemplates, routeTemplateId]
  );

  const selectedVehicle = useMemo(() => 
    vehicles.find((vehicle) => vehicle._id === vehicleId),
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

  // Populate form with trip data when loaded
  useEffect(() => {
    if (trip && trip.departureTime && trip.arrivalTime && routeTemplates.length > 0 && vehicles.length > 0 && !formInitialized) {

      // Validate that the trip's route template exists in the available options
      const validRouteTemplate = routeTemplates.find(rt => rt.id === trip.routeTemplateId);
      const validVehicle = vehicles.find(v => v._id === trip.vehicleId);
      const validLuggagePolicy = trip.luggagePolicyId ? luggagePolicies.find(lp => lp._id === trip.luggagePolicyId) : null;

      



      // Use multiple setValue calls which seem to work better than reset
      
      if (validRouteTemplate) {
        form.setValue('routeTemplateId', trip.routeTemplateId, { shouldValidate: true });
      }
      
      if (validVehicle) {
        form.setValue('vehicleId', trip.vehicleId, { shouldValidate: true });
      }
      
      if (validLuggagePolicy) {
        form.setValue('luggagePolicyId', trip.luggagePolicyId, { shouldValidate: true });
      }
      
              form.setValue('departureTime', new Date(trip.departureTime).toISOString(), { shouldValidate: true });
        form.setValue('arrivalTime', new Date(trip.arrivalTime).toISOString(), { shouldValidate: true });

      // Set selected stations
      if (trip.tripStations && trip.tripStations.length > 0) {
        const stationIds = trip.tripStations.map(ts => ts.stationId);
        setSelectedStations(new Set(stationIds));
      }

      // Mark form as initialized
      setFormInitialized(true);
    }
  }, [trip, form, routeTemplates, vehicles, luggagePolicies, formInitialized]);

  const handleStationToggle = (stationId: string) => {
    const newSelectedStations = new Set(selectedStations);
    if (newSelectedStations.has(stationId)) {
      newSelectedStations.delete(stationId);
    } else {
      newSelectedStations.add(stationId);
    }
    setSelectedStations(newSelectedStations);
  };

  const onSubmit = async (data: TripFormFields) => {
    if (!id) {
      toast.error('Trip ID is missing');
      return;
    }

    if (selectedStations.size === 0) {
      toast.error('Please select at least one station for the trip');
      return;
    }

    if (!selectedRouteTemplate) {
      toast.error('Selected route template not found');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build selected stations data with correct mapping
      const selectedStationsData = Array.from(selectedStations).map((stationId) => {
        // Find station and its city
        for (const city of selectedRouteTemplate.cities) {
          const station = city.stations?.find(s => s.id === stationId);
          if (station) {
            return {
              routeTemplateCityId: city.id!,
              routeTemplateStationId: station.id!,
              cityName: city.cityName,
              sequenceOrder: city.sequenceOrder || 0,
              isPickupPoint: true,
              isDropoffPoint: true,
            };
          }
        }
        return null;
      }).filter(Boolean) as TripFormData['selectedStations'];

      const tripData: TripFormData = {
        routeTemplateId: data.routeTemplateId,
        vehicleId: data.vehicleId,
        luggagePolicyId: data.luggagePolicyId || null,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        selectedStations: selectedStationsData,
      };

      await updateTrip(id, tripData);
      toast.success('Trip updated successfully!');
      navigate('/driver/trips');
    } catch (error) {
      toast.error(`Failed to update trip: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = trip === undefined && !!id;
  const hasLoadedData = trip && trip.departureTime && trip.arrivalTime;
  const dataReady = hasLoadedData && routeTemplates.length > 0 && vehicles.length > 0 && formInitialized;

  if (isLoading || !dataReady) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 animate-pulse text-brand-orange" />
            <span className="text-lg text-muted-foreground">Loading trip data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Card className="premium-card">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              Trip Not Found
            </h3>
            <p className="text-muted-foreground mb-4">
              The trip you're trying to edit doesn't exist or you don't have access to it.
            </p>
            <Button asChild>
              <Link to="/driver/trips">Back to Trips</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if trip can be edited (only scheduled trips that haven't started)
  if (trip.status !== 'scheduled') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Card className="premium-card">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              Trip Cannot Be Edited
            </h3>
            <p className="text-muted-foreground mb-4">
              Only scheduled trips that haven't started can be edited. This trip has status: {trip.status}
            </p>
            <Button asChild>
              <Link to="/driver/trips">Back to Trips</Link>
            </Button>
          </CardContent>
        </Card>
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
            Edit Trip
          </h1>
          <p className="text-muted-foreground">
            Update your trip details and station selections
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

        <form key={trip?.id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    key={`route-${trip?.id}`}
                    value={form.watch('routeTemplateId') || ''}
                    onValueChange={(value) => {
                      form.setValue('routeTemplateId', value, { shouldValidate: true });
                    }}
                  >
                    <SelectTrigger className="w-full h-12 px-3 bg-background">
                      <SelectValue placeholder="Select a route template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {routeTemplates.map((route) => (
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
                      key={`vehicle-${trip?.id}`}
                      value={form.watch('vehicleId') || ''}
                      onValueChange={(value) => {
                        form.setValue('vehicleId', value, { shouldValidate: true });
                      }}
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
                      key={`luggage-${trip?.id}`}
                      value={form.watch('luggagePolicyId') || 'none'}
                      onValueChange={(value) => {
                        form.setValue('luggagePolicyId', value === 'none' ? undefined : value, { shouldValidate: true });
                      }}
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
                disabled={isSubmitting || selectedStations.size === 0}
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Trip...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Trip
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