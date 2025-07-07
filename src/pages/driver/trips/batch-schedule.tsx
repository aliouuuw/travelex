import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Car, 
  Package, 
  ArrowLeft, 
  Save, 
  Users,
  Route,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useDriverVehicles } from "@/services/convex/vehicles";
import { useDriverLuggagePolicies } from "@/services/convex/luggage-policies";
import { createBatchTrips, type TripFormData } from "@/services/convex/trips";
import { useDriverRouteTemplates } from "@/services/convex/routeTemplates";
import { toast } from "sonner";
import { format, addDays, eachDayOfInterval } from "date-fns";

// Form validation schema
const batchScheduleSchema = z.object({
  routeTemplateId: z.string().min(1, "Please select a route template"),
  vehicleId: z.string().min(1, "Please select a vehicle"),
  luggagePolicyId: z.string().optional(),
  departureHour: z.string().min(1, "Please set departure hour"),
  departureMinute: z.string().min(1, "Please set departure minute"),
  departurePeriod: z.enum(["AM", "PM"]),
  arrivalHour: z.string().min(1, "Please set arrival hour"),
  arrivalMinute: z.string().min(1, "Please set arrival minute"),
  arrivalPeriod: z.enum(["AM", "PM"]),
  startDate: z.string().min(1, "Please select start date"),
  endDate: z.string().min(1, "Please select end date"),
  selectedDays: z.array(z.number()).min(1, "Please select at least one day"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
}).refine((data) => {
  const departureTime = getTimeInMinutes(data.departureHour, data.departureMinute, data.departurePeriod);
  const arrivalTime = getTimeInMinutes(data.arrivalHour, data.arrivalMinute, data.arrivalPeriod);
  return arrivalTime > departureTime;
}, {
  message: "Arrival time must be after departure time",
  path: ["arrivalHour"]
});

// Helper function to convert 12-hour format to minutes for comparison
const getTimeInMinutes = (hour: string, minute: string, period: "AM" | "PM"): number => {
  let hourNum = parseInt(hour);
  if (period === "PM" && hourNum !== 12) hourNum += 12;
  if (period === "AM" && hourNum === 12) hourNum = 0;
  return hourNum * 60 + parseInt(minute);
};

type BatchScheduleFormData = z.infer<typeof batchScheduleSchema>;

// Day selection component
const DaySelector = ({ 
  selectedDays, 
  onDayToggle 
}: {
  selectedDays: number[];
  onDayToggle: (day: number) => void;
}) => {
  const days = [
    { value: 0, label: "Sunday", short: "Sun" },
    { value: 1, label: "Monday", short: "Mon" },
    { value: 2, label: "Tuesday", short: "Tue" },
    { value: 3, label: "Wednesday", short: "Wed" },
    { value: 4, label: "Thursday", short: "Thu" },
    { value: 5, label: "Friday", short: "Fri" },
    { value: 6, label: "Saturday", short: "Sat" },
  ];

  return (
    <div className="space-y-3">
      <Label>Select Days of the Week</Label>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.value} className="flex flex-col items-center">
            <Button
              type="button"
              variant={selectedDays.includes(day.value) ? "default" : "outline"}
              size="sm"
              className="w-full h-12 flex flex-col items-center justify-center gap-1"
              onClick={() => onDayToggle(day.value)}
            >
              <span className="text-xs font-medium">{day.short}</span>
              {selectedDays.includes(day.value) && (
                <Check className="w-3 h-3" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};



export default function BatchSchedulePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());

  const form = useForm<BatchScheduleFormData>({
    resolver: zodResolver(batchScheduleSchema),
    defaultValues: {
      routeTemplateId: '',
      vehicleId: '',
      luggagePolicyId: '',
      departureHour: '8',
      departureMinute: '00',
      departurePeriod: 'AM',
      arrivalHour: '10',
      arrivalMinute: '00',
      arrivalPeriod: 'AM',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 6), 'yyyy-MM-dd'),
      selectedDays: [1, 2, 3, 4, 5], // Monday to Friday
    },
  });

  // Fetch data
  const routeTemplates = useDriverRouteTemplates();
  const vehicles = useDriverVehicles();
  const luggagePolicies = useDriverLuggagePolicies();


  // Watch form values
  const routeTemplateId = form.watch('routeTemplateId');
  const vehicleId = form.watch('vehicleId');
  const departureHour = form.watch('departureHour');
  const departureMinute = form.watch('departureMinute');
  const departurePeriod = form.watch('departurePeriod');
  const arrivalHour = form.watch('arrivalHour');
  const arrivalMinute = form.watch('arrivalMinute');
  const arrivalPeriod = form.watch('arrivalPeriod');
  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');
  const selectedDays = form.watch('selectedDays');

  const selectedRouteTemplate = useMemo(() => 
    (routeTemplates || []).find((route) => route.id === routeTemplateId),
    [routeTemplates, routeTemplateId]
  );

  // Auto-calculate arrival time based on route duration when departure time changes
  const autoCalculateArrivalTime = (departureHour: string, departureMinute: string, departurePeriod: "AM" | "PM") => {
    if (!selectedRouteTemplate?.estimatedDuration) return;
    
    // Parse estimated duration (e.g., "2h 30m" or "2.5 hours")
    const durationText = selectedRouteTemplate.estimatedDuration.toLowerCase();
    let hours = 0;
    let minutes = 0;
    
    // Extract hours and minutes from duration string
    const hourMatch = durationText.match(/(\d+(?:\.\d+)?)\s*h/);
    const minuteMatch = durationText.match(/(\d+)\s*m/);
    
    if (hourMatch) {
      hours = parseFloat(hourMatch[1]);
    }
    if (minuteMatch) {
      minutes = parseInt(minuteMatch[1]);
    }
    
    // Convert 12-hour format to 24-hour for calculation
    let departureHour24 = parseInt(departureHour);
    if (departurePeriod === "PM" && departureHour24 !== 12) departureHour24 += 12;
    if (departurePeriod === "AM" && departureHour24 === 12) departureHour24 = 0;
    
    // Calculate arrival time
    const departureTime = new Date();
    departureTime.setHours(departureHour24, parseInt(departureMinute), 0, 0);
    
    const arrivalTime = new Date(departureTime);
    arrivalTime.setHours(arrivalTime.getHours() + Math.floor(hours));
    arrivalTime.setMinutes(arrivalTime.getMinutes() + (hours % 1) * 60 + minutes);
    
    // Convert back to 12-hour format
    let arrivalHour12 = arrivalTime.getHours();
    const arrivalPeriod = arrivalHour12 >= 12 ? "PM" : "AM";
    if (arrivalHour12 === 0) arrivalHour12 = 12;
    if (arrivalHour12 > 12) arrivalHour12 -= 12;
    
    form.setValue('arrivalHour', arrivalHour12.toString());
    form.setValue('arrivalMinute', arrivalTime.getMinutes().toString().padStart(2, '0'));
    form.setValue('arrivalPeriod', arrivalPeriod);
  };

  const selectedVehicle = useMemo(() => 
    vehicles?.find((vehicle) => vehicle._id === vehicleId),
    [vehicles, vehicleId]
  );

  // Generate preview trips
  const previewTrips = useMemo(() => {
    if (!startDate || !endDate || !selectedDays.length || !departureHour || !departureMinute || !departurePeriod || !arrivalHour || !arrivalMinute || !arrivalPeriod) {
      return [];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = eachDayOfInterval({ start, end });
    
    return days
      .filter(day => selectedDays.includes(day.getDay()))
      .map(day => {
        // Convert departure time to 24-hour format
        let departureHour24 = parseInt(departureHour);
        if (departurePeriod === "PM" && departureHour24 !== 12) departureHour24 += 12;
        if (departurePeriod === "AM" && departureHour24 === 12) departureHour24 = 0;
        
        // Convert arrival time to 24-hour format
        let arrivalHour24 = parseInt(arrivalHour);
        if (arrivalPeriod === "PM" && arrivalHour24 !== 12) arrivalHour24 += 12;
        if (arrivalPeriod === "AM" && arrivalHour24 === 12) arrivalHour24 = 0;
        
        const departureTime = new Date(day);
        departureTime.setHours(departureHour24, parseInt(departureMinute), 0, 0);
        
        const arrivalTime = new Date(day);
        arrivalTime.setHours(arrivalHour24, parseInt(arrivalMinute), 0, 0);
        
        return {
          date: day,
          departureTime,
          arrivalTime,
          dayName: format(day, 'EEEE'),
        };
      });
  }, [startDate, endDate, selectedDays, departureHour, departureMinute, departurePeriod, arrivalHour, arrivalMinute, arrivalPeriod]);

  const handleDayToggle = (day: number) => {
    const currentDays = form.getValues('selectedDays');
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    form.setValue('selectedDays', newDays);
  };



  const onSubmit = async (data: BatchScheduleFormData) => {
    if (selectedStations.size === 0) {
      toast.error('Please select at least one station for the trips');
      return;
    }

    if (!selectedRouteTemplate) {
      toast.error('Selected route template not found');
      return;
    }

    if (previewTrips.length === 0) {
      toast.error('No trips to schedule based on selected criteria');
      return;
    }

    // Build selected stations data
    const selectedStationsData = Array.from(selectedStations).map((stationId) => {
      for (const city of selectedRouteTemplate.cities) {
        const station = city.stations?.find(s => s.id === stationId);
        if (station) {
          return {
            routeTemplateCityId: city.id || city.cityName,
            routeTemplateStationId: station.id,
            cityName: city.cityName,
            sequenceOrder: city.sequenceOrder,
            isPickupPoint: true,
            isDropoffPoint: true,
          };
        }
      }
      return null;
    }).filter(Boolean) as TripFormData['selectedStations'];

    // Create trip data for each preview trip
    const tripsData: TripFormData[] = previewTrips.map(trip => ({
      routeTemplateId: data.routeTemplateId,
      vehicleId: data.vehicleId,
      luggagePolicyId: data.luggagePolicyId || null,
      departureTime: trip.departureTime.toISOString(),
      arrivalTime: trip.arrivalTime.toISOString(),
      selectedStations: selectedStationsData,
    }));

    try {
      await createBatchTrips(tripsData);
      queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
      toast.success(`Successfully scheduled ${previewTrips.length} trips!`);
      navigate('/driver/trips');
    } catch (error) {
      toast.error(`Failed to schedule trips: ${(error as Error).message}`);
    }
  };

  const isLoading = !routeTemplates || !vehicles || !luggagePolicies;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 animate-pulse text-brand-orange" />
            <span className="text-lg text-muted-foreground">Loading batch scheduling form...</span>
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
            Batch Schedule Trips
          </h1>
          <p className="text-muted-foreground">
            Quickly generate multiple trips with recurring schedules
          </p>
        </div>
      </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Schedule Configuration */}
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Schedule Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Day Selection */}
                <DaySelector
                  selectedDays={selectedDays}
                  onDayToggle={handleDayToggle}
                />

                {/* Time Selection */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Departure Time</Label>
                      <div className="flex gap-2">
                        <Select
                          value={departureHour}
                          onValueChange={(value) => {
                            form.setValue('departureHour', value);
                            // Auto-calculate arrival time when departure time changes
                            if (selectedRouteTemplate?.estimatedDuration) {
                              autoCalculateArrivalTime(value, departureMinute, departurePeriod);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="flex items-center text-lg font-medium">:</span>
                        <Select
                          value={departureMinute}
                          onValueChange={(value) => {
                            form.setValue('departureMinute', value);
                            // Auto-calculate arrival time when departure time changes
                            if (selectedRouteTemplate?.estimatedDuration) {
                              autoCalculateArrivalTime(departureHour, value, departurePeriod);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={departurePeriod}
                          onValueChange={(value: "AM" | "PM") => {
                            form.setValue('departurePeriod', value);
                            // Auto-calculate arrival time when departure time changes
                            if (selectedRouteTemplate?.estimatedDuration) {
                              autoCalculateArrivalTime(departureHour, departureMinute, value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.formState.errors.departureHour && (
                        <p className="text-sm text-red-600">{form.formState.errors.departureHour.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Arrival Time</Label>
                      <div className="flex gap-2">
                        <Select
                          value={arrivalHour}
                          onValueChange={(value) => form.setValue('arrivalHour', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="flex items-center text-lg font-medium">:</span>
                        <Select
                          value={arrivalMinute}
                          onValueChange={(value) => form.setValue('arrivalMinute', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={arrivalPeriod}
                          onValueChange={(value: "AM" | "PM") => form.setValue('arrivalPeriod', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.formState.errors.arrivalHour && (
                        <p className="text-sm text-red-600">{form.formState.errors.arrivalHour.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Auto-calculate button */}
                  {selectedRouteTemplate?.estimatedDuration && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => autoCalculateArrivalTime(departureHour, departureMinute, departurePeriod)}
                        className="text-sm"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Auto-calculate based on route duration ({selectedRouteTemplate.estimatedDuration})
                      </Button>
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      type="date"
                      {...form.register('startDate')}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                    {form.formState.errors.startDate && (
                      <p className="text-sm text-red-600">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      type="date"
                      {...form.register('endDate')}
                      min={startDate}
                    />
                    {form.formState.errors.endDate && (
                      <p className="text-sm text-red-600">{form.formState.errors.endDate.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Station Selection */}
            {selectedRouteTemplate && (
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Select Stations
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose which stations to serve for all trips
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedRouteTemplate.cities.map((city, cityIndex) => (
                    <div key={city.cityName} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                          {cityIndex + 1}
                        </div>
                        <h4 className="font-semibold text-lg">{city.cityName}</h4>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {city.stations?.map((station) => (
                          <div
                            key={station.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedStations.has(station.id!)
                                ? 'border-brand-orange bg-brand-orange/5'
                                : 'border-border hover:border-muted-foreground/50'
                            }`}
                            onClick={() => {
                              const newSelectedStations = new Set(selectedStations);
                              if (newSelectedStations.has(station.id!)) {
                                newSelectedStations.delete(station.id!);
                              } else {
                                newSelectedStations.add(station.id!);
                              }
                              setSelectedStations(newSelectedStations);
                            }}
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
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {previewTrips.length > 0 && (
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Schedule Preview
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {previewTrips.length} trips will be created
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {previewTrips.map((trip, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{trip.dayName}</Badge>
                          <span className="font-medium">{format(trip.date, 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(trip.departureTime, 'h:mm a')} - {format(trip.arrivalTime, 'h:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={previewTrips.length === 0 || selectedStations.size === 0}
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Schedule {previewTrips.length} Trips
              </Button>
            </div>
        </form>
    </div>
  );
} 