import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Save, 
  X,
  Plus
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDriverRouteTemplates } from "@/services/route-templates";
import { getDriverVehicles } from "@/services/vehicles";
import { getDriverLuggagePolicies } from "@/services/luggage-policies";
import { createTrip, type TripFormData } from "@/services/trips";
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

export default function QuickScheduleModal({ isOpen, onClose, selectedDate }: QuickScheduleModalProps) {
  const queryClient = useQueryClient();
  
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

  const onSubmit = (data: QuickScheduleFormData) => {
    // Build trip data with minimal station selection (use all stations for quick scheduling)
    const selectedRoute = routeTemplates.find(r => r.id === data.routeTemplateId);
    
    if (!selectedRoute) {
      toast.error('Selected route not found');
      return;
    }

    // Auto-select all stations for quick scheduling
    const selectedStations = selectedRoute.cities.flatMap(city => 
      city.stations?.map(station => ({
        stationId: station.id,
        cityName: city.cityName,
        sequenceOrder: city.sequenceOrder,
        isPickupPoint: true,
        isDropoffPoint: true,
      })) || []
    );

    const tripData: TripFormData = {
      routeTemplateId: data.routeTemplateId,
      vehicleId: data.vehicleId,
      luggagePolicyId: data.luggagePolicyId || null,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      selectedStations,
    };

    createTripMutation.mutate(tripData);
  };

  // Set default times based on selected date
  React.useEffect(() => {
    if (selectedDate && isOpen) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const defaultDeparture = `${dateStr}T08:00`;
      const defaultArrival = `${dateStr}T18:00`;
      
      form.setValue('departureTime', defaultDeparture);
      form.setValue('arrivalTime', defaultArrival);
    }
  }, [selectedDate, isOpen, form]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 bg-white">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Route Selection */}
            <div className="space-y-2">
              <Label htmlFor="routeTemplateId" className="text-sm font-medium">Route Template</Label>
              <select
                id="routeTemplateId"
                {...form.register('routeTemplateId')}
                className="w-full p-3 border border-border rounded-lg bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              >
                <option value="">Select a route...</option>
                {routeTemplates.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name} ({route.cities.map(c => c.cityName).join(' → ')})
                  </option>
                ))}
              </select>
              {form.formState.errors.routeTemplateId && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.routeTemplateId.message}</p>
              )}
            </div>

            {/* Vehicle and Luggage */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicleId" className="text-sm font-medium">Vehicle</Label>
                <select
                  id="vehicleId"
                  {...form.register('vehicleId')}
                  className="w-full p-3 border border-border rounded-lg bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles
                    .filter(v => v.status === 'active')
                    .map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.capacity} seats)
                    </option>
                  ))}
                </select>
                {form.formState.errors.vehicleId && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.vehicleId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="luggagePolicyId" className="text-sm font-medium">Luggage Policy <span className="text-muted-foreground">(Optional)</span></Label>
                <select
                  id="luggagePolicyId"
                  {...form.register('luggagePolicyId')}
                  className="w-full p-3 border border-border rounded-lg bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                >
                  <option value="">Default policy</option>
                  {luggagePolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time Selection */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="departureTime" className="text-sm font-medium">Departure Time</Label>
                <Input
                  id="departureTime"
                  type="datetime-local"
                  {...form.register('departureTime')}
                  className="focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                />
                {form.formState.errors.departureTime && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.departureTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalTime" className="text-sm font-medium">Arrival Time</Label>
                <Input
                  id="arrivalTime"
                  type="datetime-local"
                  {...form.register('arrivalTime')}
                  min={form.watch('departureTime')}
                  className="focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                />
                {form.formState.errors.arrivalTime && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{form.formState.errors.arrivalTime.message}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTripMutation.isPending}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 