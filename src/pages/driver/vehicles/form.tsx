import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Car, 
  Save, 
  Loader2, 
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle,
  Users,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createVehicle,
  updateVehicle,
  getDriverVehicles,
  generateBasicSeatMap,
  VEHICLE_TYPES,
  FUEL_TYPES,
  VEHICLE_STATUS,
  VEHICLE_FEATURES,
  type CreateVehicleData,
  type UpdateVehicleData,
} from "@/services/supabase/vehicles";
import { toast } from "sonner";

// Validation Schema
const vehicleFormSchema = z.object({
  make: z.string().min(1, "Make is required").max(100, "Make too long"),
  model: z.string().min(1, "Model is required").max(100, "Model too long"),
  year: z.number()
    .min(1990, "Year must be 1990 or later")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
  license_plate: z.string().min(1, "License plate is required").max(20, "License plate too long"),
  vehicle_type: z.enum(['car', 'van', 'bus', 'suv'], {
    required_error: "Vehicle type is required"
  }),
  fuel_type: z.enum(['gasoline', 'diesel', 'electric', 'hybrid'], {
    required_error: "Fuel type is required"
  }),
  color: z.string().optional(),
  capacity: z.number()
    .min(1, "Capacity must be at least 1")
    .max(50, "Capacity cannot exceed 50"),
  features: z.array(z.string()).optional(),
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  insurance_expiry: z.string().optional(),
  registration_expiry: z.string().optional(),
  last_maintenance: z.string().optional(),
  mileage: z.number().min(0, "Mileage cannot be negative").optional(),
  description: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

const SeatMapPreview = ({ capacity, vehicleType }: { capacity: number; vehicleType: string }) => {
  const seatMap = generateBasicSeatMap(capacity, vehicleType);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Seat Layout Preview</span>
      </div>
      
      <div className="border border-border/40 rounded-lg p-4 bg-muted/20">
        <div className="space-y-2">
          {seatMap.layout.map((row) => (
            <div key={row.row} className="flex justify-center gap-1">
              {row.seats.map((seat) => (
                <div
                  key={seat.id}
                  className="w-8 h-8 bg-blue-100 border border-blue-300 rounded text-xs flex items-center justify-center font-medium text-blue-700"
                >
                  {seat.id}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {capacity} seats • {seatMap.rows} rows × {seatMap.columns} columns
        </p>
      </div>
    </div>
  );
};

export default function VehicleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();
  
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      license_plate: "",
      vehicle_type: "car",
      fuel_type: "gasoline",
      color: "",
      capacity: 4,
      features: [],
      status: "active",
      insurance_expiry: "",
      registration_expiry: "",
      last_maintenance: "",
      mileage: 0,
      description: "",
    },
  });

  // Fetch vehicles to find the one being edited
  const { data: vehicles = [] } = useQuery({
    queryKey: ['driver-vehicles'],
    queryFn: getDriverVehicles,
    enabled: isEditing,
  });

  const currentVehicle = isEditing ? vehicles.find(v => v.id === id) : null;

  // Load vehicle data for editing
  useEffect(() => {
    if (currentVehicle) {
      form.reset({
        make: currentVehicle.make,
        model: currentVehicle.model,
        year: currentVehicle.year,
        license_plate: currentVehicle.license_plate,
        vehicle_type: currentVehicle.vehicle_type,
        fuel_type: currentVehicle.fuel_type,
        color: currentVehicle.color || "",
        capacity: currentVehicle.capacity,
        features: currentVehicle.features || [],
        status: currentVehicle.status,
        insurance_expiry: currentVehicle.insurance_expiry || "",
        registration_expiry: currentVehicle.registration_expiry || "",
        last_maintenance: currentVehicle.last_maintenance || "",
        mileage: currentVehicle.mileage,
        description: currentVehicle.description || "",
      });
      setSelectedFeatures(currentVehicle.features || []);
    }
  }, [currentVehicle, form]);

  const { mutate: createVehicleMutation, isPending: isCreating } = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      toast.success("Vehicle created successfully!");
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      navigate('/driver/vehicles');
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create vehicle");
    },
  });

  const { mutate: updateVehicleMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ vehicleId, data }: { vehicleId: string; data: UpdateVehicleData }) =>
      updateVehicle(vehicleId, data),
    onSuccess: () => {
      toast.success("Vehicle updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      navigate('/driver/vehicles');
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update vehicle");
    },
  });

  const onSubmit = (data: VehicleFormData) => {
    const formData = {
      ...data,
      features: selectedFeatures,
      seat_map: generateBasicSeatMap(data.capacity, data.vehicle_type),
      // Convert empty strings to undefined for optional date fields
      insurance_expiry: data.insurance_expiry || undefined,
      registration_expiry: data.registration_expiry || undefined,
      last_maintenance: data.last_maintenance || undefined,
    };

    if (isEditing && id) {
      updateVehicleMutation({ vehicleId: id, data: formData });
    } else {
      createVehicleMutation(formData as CreateVehicleData);
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const isPending = isCreating || isUpdating;
  const watchedCapacity = form.watch("capacity");
  const watchedVehicleType = form.watch("vehicle_type");

  if (isEditing && !currentVehicle && vehicles.length > 0) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            Vehicle not found
          </h3>
          <p className="text-muted-foreground mb-6">
            The vehicle you're trying to edit doesn't exist or you don't have permission to edit it.
          </p>
          <Button onClick={() => navigate('/driver/vehicles')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vehicles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/driver/vehicles')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing 
              ? 'Update your vehicle information and settings'
              : 'Add a new vehicle to your fleet'
            }
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <Card className="premium-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg">Vehicle Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Basic details about your vehicle</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      {...form.register("make")}
                      placeholder="e.g. Toyota, Honda, Ford"
                      className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                    />
                    {form.formState.errors.make && (
                      <p className="text-xs text-destructive">{form.formState.errors.make.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      {...form.register("model")}
                      placeholder="e.g. Camry, Civic, Focus"
                      className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                    />
                    {form.formState.errors.model && (
                      <p className="text-xs text-destructive">{form.formState.errors.model.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      {...form.register("year", { valueAsNumber: true })}
                      placeholder="2020"
                      className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                    />
                    {form.formState.errors.year && (
                      <p className="text-xs text-destructive">{form.formState.errors.year.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license_plate">License Plate *</Label>
                    <Input
                      id="license_plate"
                      {...form.register("license_plate")}
                      placeholder="ABC-1234"
                      className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                    />
                    {form.formState.errors.license_plate && (
                      <p className="text-xs text-destructive">{form.formState.errors.license_plate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                    <Select
                      value={form.watch("vehicle_type")}
                      onValueChange={(value) => form.setValue("vehicle_type", value as "car" | "van" | "bus" | "suv")}
                    >
                      <SelectTrigger className="w-full h-11 px-3 bg-background border-border/60 focus:border-brand-orange focus:ring-brand-orange/20">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.vehicle_type && (
                      <p className="text-xs text-destructive">{form.formState.errors.vehicle_type.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuel_type">Fuel Type *</Label>
                    <Select
                      value={form.watch("fuel_type")}
                      onValueChange={(value) => form.setValue("fuel_type", value as "gasoline" | "diesel" | "electric" | "hybrid")}
                    >
                      <SelectTrigger className="w-full h-11 px-3 bg-background border-border/60 focus:border-brand-orange focus:ring-brand-orange/20">
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.fuel_type && (
                      <p className="text-xs text-destructive">{form.formState.errors.fuel_type.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="premium-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                        <Settings className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-lg">Vehicle Details</CardTitle>
                        <p className="text-sm text-muted-foreground">Additional vehicle specifications</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <Input
                          id="color"
                          {...form.register("color")}
                          placeholder="e.g. Red, Blue, White"
                          className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="capacity">Passenger Capacity *</Label>
                        <Input
                          id="capacity"
                          type="number"
                          {...form.register("capacity", { valueAsNumber: true })}
                          placeholder="4"
                          min="1"
                          max="50"
                          className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                        />
                        {form.formState.errors.capacity && (
                          <p className="text-xs text-destructive">{form.formState.errors.capacity.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mileage">Current Mileage (km)</Label>
                        <Input
                          id="mileage"
                          type="number"
                          {...form.register("mileage", { valueAsNumber: true })}
                          placeholder="50000"
                          min="0"
                          className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                        />
                        {form.formState.errors.mileage && (
                          <p className="text-xs text-destructive">{form.formState.errors.mileage.message}</p>
                        )}
                      </div>

                      {isEditing && (
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={form.watch("status")}
                            onValueChange={(value) => form.setValue("status", value as "active" | "inactive")}
                          >
                            <SelectTrigger className="w-full h-11 px-3 bg-background border-border/60 focus:border-brand-orange focus:ring-brand-orange/20">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_STATUS.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        {...form.register("description")}
                        placeholder="Additional notes about your vehicle..."
                        rows={3}
                        className="flex w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm ring-offset-background focus:border-brand-orange focus:ring-brand-orange/20 focus:outline-none focus:ring-2 focus:ring-offset-2 resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <SeatMapPreview capacity={watchedCapacity} vehicleType={watchedVehicleType} />
              </div>
            </div>
          </TabsContent>

          {/* Features */}
          <TabsContent value="features" className="space-y-6">
            <Card className="premium-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg">Vehicle Features</CardTitle>
                    <p className="text-sm text-muted-foreground">Select the amenities and features your vehicle offers</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {VEHICLE_FEATURES.map((feature) => (
                    <div
                      key={feature.value}
                      onClick={() => toggleFeature(feature.value)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedFeatures.includes(feature.value)
                          ? 'border-brand-orange bg-brand-orange/10'
                          : 'border-border/40 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedFeatures.includes(feature.value)
                            ? 'border-brand-orange bg-brand-orange'
                            : 'border-border/40'
                        }`}>
                          {selectedFeatures.includes(feature.value) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{feature.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedFeatures.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Selected Features:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeatures.map((feature) => {
                        const featureLabel = VEHICLE_FEATURES.find(f => f.value === feature)?.label || feature;
                        return (
                          <Badge key={feature} variant="secondary" className="bg-blue-100 text-blue-800">
                            {featureLabel}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card className="premium-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg">Maintenance & Documentation</CardTitle>
                    <p className="text-sm text-muted-foreground">Keep track of important dates and maintenance</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                    <Input
                      id="insurance_expiry"
                      type="date"
                      {...form.register("insurance_expiry")}
                      className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registration_expiry">Registration Expiry</Label>
                    <Input
                      id="registration_expiry"
                      type="date"
                      {...form.register("registration_expiry")}
                      className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_maintenance">Last Maintenance</Label>
                    <Input
                      id="last_maintenance"
                      type="date"
                      {...form.register("last_maintenance")}
                      className="border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Maintenance Reminders</h4>
                      <p className="text-sm text-blue-800">
                        We'll notify you 30 days before your insurance or registration expires, 
                        and remind you about maintenance every 6 months.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/driver/vehicles')}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
          </Button>
        </div>
      </form>
    </div>
  );
} 