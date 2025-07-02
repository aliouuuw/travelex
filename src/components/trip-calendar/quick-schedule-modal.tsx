import React, { useState, useMemo } from "react";
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
  Calendar as CalendarIcon, 
  Save, 
  X,
  Plus,
  Clock,
  MapPin
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDriverRouteTemplates, type RouteTemplate } from "@/services/supabase/route-templates";
import { getDriverVehicles } from "@/services/supabase/vehicles";
import { getDriverLuggagePolicies } from "@/services/supabase/luggage-policies";
import { createTrip, type TripFormData } from "@/services/supabase/trips";
import { toast } from "sonner";

// Quick schedule form schema
const quickScheduleSchema = z.object({
  routeTemplateId: z.string().min(1, "Please select a route"),
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

type QuickScheduleFormData = z.infer<typeof quickScheduleSchema>;

interface QuickScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

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
                    onChange={() => onStationToggle(station.id!)}
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
    </div>
  );
};

export default function QuickScheduleModal({ isOpen, onClose, selectedDate }: QuickScheduleModalProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<'details' | 'stations'>('details');
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  
  const form = useForm<QuickScheduleFormData>({
    resolver: zodResolver(quickScheduleSchema),
    defaultValues: {
      routeTemplateId: '',
      vehicleId: '',
      luggagePolicyId: '',
      departureTime: '',
      arrivalTime: '',
    },
  });

  // Fetch data for dropdowns
  const { data: routeTemplates = [] } = useQuery({
    queryKey: ['driver-route-templates'],
    queryFn: getDriverRouteTemplates,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['driver-vehicles'],
    queryFn: getDriverVehicles,
  });

  const { data: luggagePolicies = [] } = useQuery({
    queryKey: ['driver-luggage-policies'],
    queryFn: getDriverLuggagePolicies,
  });

  // Watch form values for reactivity
  const routeTemplateId = form.watch('routeTemplateId');
  const vehicleId = form.watch('vehicleId');
  const departureTime = form.watch('departureTime');
  const arrivalTime = form.watch('arrivalTime');

  const selectedRouteTemplate = useMemo(() => 
    routeTemplates.find((route) => route.id === routeTemplateId),
    [routeTemplates, routeTemplateId]
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

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
      toast.success('Trip scheduled successfully!');
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to schedule trip: ${error.message}`);
    },
  });

  const handleStationToggle = (stationId: string) => {
    const newSelectedStations = new Set(selectedStations);
    if (newSelectedStations.has(stationId)) {
      newSelectedStations.delete(stationId);
    } else {
      newSelectedStations.add(stationId);
    }
    setSelectedStations(newSelectedStations);
  };

  const onSubmit = (data: QuickScheduleFormData) => {
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
            stationId: station.id,
            cityName: city.cityName,
            sequenceOrder: city.sequenceOrder,
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

    createTripMutation.mutate(tripData);
  };

  // Set default times based on selected date
  React.useEffect(() => {
    if (selectedDate && isOpen) {
      const defaultDeparture = new Date(selectedDate);
      defaultDeparture.setHours(8, 0, 0, 0);
      
      const defaultArrival = new Date(selectedDate);
      defaultArrival.setHours(18, 0, 0, 0);
      
      form.setValue('departureTime', defaultDeparture.toISOString().slice(0, 16));
      form.setValue('arrivalTime', defaultArrival.toISOString().slice(0, 16));
      form.trigger(['departureTime', 'arrivalTime']);
    }
  }, [selectedDate, isOpen, form]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-orange">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Quick Schedule Trip</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
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
            {/* Route Selection */}
            <div className="space-y-2">
              <Label htmlFor="routeTemplateId" className="text-sm font-medium">Route Template</Label>
              <Select
                value={form.watch('routeTemplateId')}
                onValueChange={(value) => form.setValue('routeTemplateId', value)}
              >
                <SelectTrigger className="w-full h-12 px-3 bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent">
                  <SelectValue placeholder="Select a route..." />
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
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.routeTemplateId.message}</p>
              )}
            </div>

            {/* Vehicle and Luggage */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicleId" className="text-sm font-medium">Vehicle</Label>
                <Select
                  value={form.watch('vehicleId')}
                  onValueChange={(value) => form.setValue('vehicleId', value)}
                >
                  <SelectTrigger className="w-full h-12 px-3 bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent">
                    <SelectValue placeholder="Select vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles
                      .filter(v => v.status === 'active')
                      .map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.capacity} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.vehicleId && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.vehicleId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="luggagePolicyId" className="text-sm font-medium">Luggage Policy <span className="text-muted-foreground">(Optional)</span></Label>
                <Select
                  value={form.watch('luggagePolicyId') || undefined}
                  onValueChange={(value) => form.setValue('luggagePolicyId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger className="w-full h-12 px-3 bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent">
                    <SelectValue placeholder="Default policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default policy</SelectItem>
                    {luggagePolicies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Selection */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="departureTime" className="text-sm font-medium">Departure Time</Label>
                <DateTimePickerField
                  value={form.watch('departureTime')}
                  onChange={(date) => {
                    form.setValue('departureTime', date.toISOString().slice(0, 16));
                    form.trigger('departureTime');
                  }}
                  placeholder="Select departure time"
                  minDate={new Date()}
                />
                {form.formState.errors.departureTime && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.departureTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalTime" className="text-sm font-medium">Arrival Time</Label>
                <DateTimePickerField
                  value={form.watch('arrivalTime')}
                  onChange={(date) => {
                    form.setValue('arrivalTime', date.toISOString().slice(0, 16));
                    form.trigger('arrivalTime');
                  }}
                  placeholder="Select arrival time"
                  minDate={form.watch('departureTime') ? new Date(form.watch('departureTime')) : new Date()}
                />
                {form.formState.errors.arrivalTime && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.arrivalTime.message}</p>
                )}
              </div>
            </div>

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
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Select Stations to Serve
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose which stations along your route you'll pick up and drop off passengers
                      </p>
                    </div>
                    <StationSelector
                      routeTemplate={selectedRouteTemplate}
                      selectedStations={selectedStations}
                      onStationToggle={handleStationToggle}
                    />
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                      No Route Selected
                    </h3>
                    <p className="text-muted-foreground">
                      Please go back and select a route template first.
                    </p>
                  </div>
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
                    disabled={createTripMutation.isPending || selectedStations.size === 0}
                    className="bg-brand-orange hover:bg-brand-orange-600 text-white"
                  >
                    {createTripMutation.isPending ? (
                      <>
                        <CalendarIcon className="w-4 h-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Schedule Trip
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 