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
  Grid3X3,
  Trash2,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  useDriverVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  generateBasicSeatMap,
  VEHICLE_TYPES,
  FUEL_TYPES,
  VEHICLE_STATUS,
  VEHICLE_FEATURES,
  type SeatMap,
  type Seat,
} from "@/services/convex/vehicles";
import { toast } from "sonner";
import type { Id } from "convex/_generated/dataModel";


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

// Seat Layout Editor Component
const SeatLayoutEditor = ({ 
  seatMap, 
  onSeatMapChange,
  capacity,
  vehicleType 
}: { 
  seatMap: SeatMap; 
  onSeatMapChange: (seatMap: SeatMap) => void;
  capacity: number;
  vehicleType: string;
}) => {
  const [editingSeatMap, setEditingSeatMap] = useState<SeatMap>(seatMap);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'click' | 'drag'>('click');

  // Update editing seat map when prop changes
  useEffect(() => {
    setEditingSeatMap(seatMap);
  }, [seatMap]);

  const handleSeatClick = (seatId: string) => {
    if (selectedSeat === seatId) {
      setSelectedSeat(null);
    } else {
      setSelectedSeat(seatId);
    }
  };

  const handleSeatTypeChange = (seatId: string, newType: Seat['type']) => {
    const newSeatMap = {
      ...editingSeatMap,
      layout: editingSeatMap.layout.map(row => ({
        ...row,
        seats: row.seats.map(seat => 
          seat.id === seatId 
            ? { ...seat, type: newType }
            : seat
        )
      }))
    };
    setEditingSeatMap(newSeatMap);
    onSeatMapChange(newSeatMap);
  };

  const handleAddSeat = (rowIndex: number, position: 'start' | 'end') => {
    const newSeatMap = { ...editingSeatMap };
    const row = newSeatMap.layout[rowIndex];
    
    if (!row) return;

    const newColumn = position === 'start' ? 0 : row.seats.length + 1;
    const newSeat: Seat = {
      id: `${row.row}-${newColumn}`,
      row: row.row,
      column: newColumn,
      type: 'regular',
      available: true,
    };

    if (position === 'start') {
      row.seats.unshift(newSeat);
      // Update column numbers for existing seats
      row.seats.forEach((seat, index) => {
        seat.column = index + 1;
        seat.id = `${row.row}-${index + 1}`;
      });
    } else {
      row.seats.push(newSeat);
    }

    setEditingSeatMap(newSeatMap);
    onSeatMapChange(newSeatMap);
  };

  const handleRemoveSeat = (seatId: string) => {
    const newSeatMap = {
      ...editingSeatMap,
      layout: editingSeatMap.layout.map(row => ({
        ...row,
        seats: row.seats.filter(seat => seat.id !== seatId)
      })).filter(row => row.seats.length > 0)
    };
    setEditingSeatMap(newSeatMap);
    onSeatMapChange(newSeatMap);
    setSelectedSeat(null);
  };

  const handleAddRow = () => {
    const newRowNumber = editingSeatMap.layout.length + 1;
    const newRow = {
      row: newRowNumber,
      seats: []
    };
    
    const newSeatMap = {
      ...editingSeatMap,
      rows: editingSeatMap.rows + 1,
      layout: [...editingSeatMap.layout, newRow]
    };
    
    setEditingSeatMap(newSeatMap);
    onSeatMapChange(newSeatMap);
  };

  const handleRemoveRow = (rowIndex: number) => {
    const newSeatMap = {
      ...editingSeatMap,
      rows: editingSeatMap.rows - 1,
      layout: editingSeatMap.layout.filter((_, index) => index !== rowIndex)
    };
    setEditingSeatMap(newSeatMap);
    onSeatMapChange(newSeatMap);
  };

  const handleResetLayout = () => {
    const basicLayout = generateBasicSeatMap(capacity, vehicleType);
    setEditingSeatMap(basicLayout);
    onSeatMapChange(basicLayout);
    setSelectedSeat(null);
  };

  const getSeatClassName = (seat: Seat | string) => {
    const baseClasses = "w-10 h-10 border-2 rounded text-xs font-bold flex items-center justify-center transition-all duration-200 cursor-pointer";
    
    const seatType = typeof seat === 'string' ? seat : seat.type;
    const seatId = typeof seat === 'string' ? '' : seat.id;
    
    if (selectedSeat === seatId) {
      return `${baseClasses} bg-brand-orange border-brand-orange text-white shadow-lg scale-110`;
    }

    switch (seatType) {
      case 'disabled':
        return `${baseClasses} bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-50`;
      case 'empty':
        return `${baseClasses} bg-transparent border-dashed border-gray-300 text-gray-400`;
      default:
        return `${baseClasses} bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200`;
    }
  };

  const getSeatTypeColor = (type: Seat['type']) => {
    switch (type) {
      case 'disabled': return 'bg-gray-500';
      case 'empty': return 'bg-transparent border border-gray-300';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Customize Seat Layout</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Button
              type="button"
              variant={editMode === 'click' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEditMode('click')}
              className="text-xs"
            >
              Click
            </Button>
            <Button
              type="button"
              variant={editMode === 'drag' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEditMode('drag')}
              className="text-xs"
            >
              Drag & Drop
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Vehicle Front Indicator */}
      <div className="flex justify-center">
        <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
          Front of Vehicle
        </div>
      </div>

      {/* Seat Grid */}
      <div className="border border-border/40 rounded-lg p-6 bg-muted/20">
        {editMode === 'click' ? (
          <div className="space-y-4">
            {editingSeatMap.layout.map((row, rowIndex) => (
              <div key={row.row} className="flex items-center gap-2">
                {/* Row Controls */}
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSeat(rowIndex, 'start')}
                    className="w-6 h-6 p-0 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveRow(rowIndex)}
                    className="w-6 h-6 p-0 text-xs text-red-600 hover:text-red-700"
                    disabled={editingSeatMap.layout.length <= 1}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Seats */}
                <div className="flex gap-2">
                  {row.seats.map((seat) => (
                    <div key={seat.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => handleSeatClick(seat.id)}
                        className={getSeatClassName(seat)}
                      >
                        {seat.type === 'empty' ? '·' : seat.id}
                      </button>
                      
                      {/* Seat Type Menu */}
                      {selectedSeat === seat.id && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2 min-w-[120px]">
                          <div className="text-xs font-medium mb-2 text-gray-700">Seat Type</div>
                          <div className="space-y-1">
                            {(['regular', 'disabled', 'empty'] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleSeatTypeChange(seat.id, type)}
                                className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 hover:bg-gray-100 ${
                                  seat.type === type ? 'bg-gray-100' : ''
                                }`}
                              >
                                <div className={`w-3 h-3 rounded ${getSeatTypeColor(type)}`}></div>
                                <span className="capitalize">{type}</span>
                              </button>
                            ))}
                          </div>
                          <div className="border-t mt-2 pt-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveSeat(seat.id)}
                              className="w-full text-left px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50"
                            >
                              Remove Seat
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Add seat to end of row */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSeat(rowIndex, 'end')}
                    className="w-10 h-10 p-0 text-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {/* Add new row */}
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Row
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Drag & Drop mode - Click on grid cells to toggle seat types
            </div>
            
            {/* Simple Grid-based Editor */}
            <div className="flex justify-center">
              <div className="grid gap-2" style={{ 
                gridTemplateColumns: `repeat(${Math.max(editingSeatMap.columns, 4)}, 1fr)` 
              }}>
                {Array.from({ length: editingSeatMap.rows * Math.max(editingSeatMap.columns, 4) }, (_, index) => {
                  const row = Math.floor(index / Math.max(editingSeatMap.columns, 4)) + 1;
                  const col = (index % Math.max(editingSeatMap.columns, 4)) + 1;
                  const seatId = `${row}-${col}`;
                  const existingSeat = editingSeatMap.layout
                    .find(r => r.row === row)?.seats
                    .find(s => s.column === col);
                  
                  const seatType = existingSeat?.type || 'empty';
                  
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        if (existingSeat) {
                          // Cycle through seat types
                          const types: Seat['type'][] = ['regular', 'disabled', 'empty'];
                          const currentIndex = types.indexOf(seatType);
                          const nextType = types[(currentIndex + 1) % types.length];
                          handleSeatTypeChange(seatId, nextType);
                        } else {
                          // Add new seat
                          const newSeat: Seat = {
                            id: seatId,
                            row,
                            column: col,
                            type: 'regular',
                            available: true,
                          };
                          
                          const newSeatMap = { ...editingSeatMap };
                          let targetRow = newSeatMap.layout.find(r => r.row === row);
                          
                          if (!targetRow) {
                            targetRow = { row, seats: [] };
                            newSeatMap.layout.push(targetRow);
                            newSeatMap.rows = Math.max(newSeatMap.rows, row);
                          }
                          
                          targetRow.seats.push(newSeat);
                          targetRow.seats.sort((a, b) => a.column - b.column);
                          
                          setEditingSeatMap(newSeatMap);
                          onSeatMapChange(newSeatMap);
                        }
                      }}
                      className={`
                        w-10 h-10 border-2 rounded text-xs font-bold flex items-center justify-center
                        transition-all duration-200 cursor-pointer
                        ${getSeatClassName(seatType)}
                      `}
                      title={`Row ${row}, Column ${col} - ${seatType}`}
                    >
                      {seatType === 'empty' ? '·' : seatId}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
              Grid: {editingSeatMap.rows} rows × {Math.max(editingSeatMap.columns, 4)} columns
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-100 border-2 border-blue-300 rounded"></div>
          <span className="text-sm text-muted-foreground">Regular</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-100 border-2 border-gray-300 rounded opacity-50"></div>
          <span className="text-sm text-muted-foreground">Disabled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-transparent border-2 border-dashed border-gray-300 rounded"></div>
          <span className="text-sm text-muted-foreground">Empty</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">How to customize your seat layout</h4>
            {editMode === 'click' ? (
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click on any seat to change its type (Regular, Disabled, Empty)</li>
                <li>• Use the + buttons to add seats to rows</li>
                <li>• Use the trash icon to remove rows</li>
                <li>• Disabled seats are not available for booking</li>
                <li>• Empty spaces create gaps in the layout</li>
              </ul>
            ) : (
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click on any grid cell to cycle through seat types</li>
                <li>• Regular → Disabled → Empty → Regular</li>
                <li>• Disabled seats are not available for booking</li>
                <li>• Empty spaces create gaps in the layout</li>
                <li>• Switch to "Click" mode for more advanced editing</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VehicleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customSeatMap, setCustomSeatMap] = useState<SeatMap | null>(null);

  const vehicles = useDriverVehicles();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();

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

  const currentVehicle = isEditing ? vehicles?.find(v => v._id === id) : null;

  // Load vehicle data for editing
  useEffect(() => {
    if (currentVehicle) {
      form.reset({
        make: currentVehicle.make,
        model: currentVehicle.model,
        year: currentVehicle.year,
        license_plate: currentVehicle.licensePlate || "",
        vehicle_type: (currentVehicle.type as "car" | "van" | "bus" | "suv") || "car",
        fuel_type: (currentVehicle.fuelType as "gasoline" | "diesel" | "electric" | "hybrid") || "gasoline",
        color: currentVehicle.color || "",
        capacity: currentVehicle.capacity,
        features: currentVehicle.features || [],
        status: currentVehicle.status,
        insurance_expiry: currentVehicle.insuranceExpiry || "",
        registration_expiry: currentVehicle.registrationExpiry || "",
        last_maintenance: currentVehicle.lastMaintenance || "",
        mileage: currentVehicle.mileage || 0,
        description: currentVehicle.description || "",
      });
      setSelectedFeatures(currentVehicle.features || []);
      setCustomSeatMap(currentVehicle.seatMap || null);
    }
  }, [currentVehicle, form]);

  const onSubmit = async (data: VehicleFormData) => {
    setIsLoading(true);
    try {
      const formData = {
        make: data.make,
        model: data.model,
        year: data.year,
        licensePlate: data.license_plate,
        vehicleType: data.vehicle_type,
        fuelType: data.fuel_type,
        color: data.color,
        capacity: data.capacity,
        features: selectedFeatures,
        seatMap: customSeatMap || generateBasicSeatMap(data.capacity, data.vehicle_type),
        // Convert empty strings to undefined for optional date fields
        insuranceExpiry: data.insurance_expiry || undefined,
        registrationExpiry: data.registration_expiry || undefined,
        lastMaintenance: data.last_maintenance || undefined,
        mileage: data.mileage,
        description: data.description,
        ...(isEditing && { status: data.status }),
      };

      if (isEditing && id) {
        await updateVehicle({ 
          vehicleId: id as Id<"vehicles">,
          make: formData.make,
          model: formData.model,
          year: formData.year,
          licensePlate: formData.licensePlate,
          vehicleType: formData.vehicleType,
          fuelType: formData.fuelType,
          color: formData.color,
          capacity: formData.capacity,
          seatMap: formData.seatMap,
          features: formData.features,
          insuranceExpiry: formData.insuranceExpiry,
          registrationExpiry: formData.registrationExpiry,
          lastMaintenance: formData.lastMaintenance,
          mileage: formData.mileage,
          description: formData.description,
          status: formData.status,
        });
        toast.success("Vehicle updated successfully!");
      } else {
        await createVehicle(formData);
        toast.success("Vehicle created successfully!");
      }
      
      navigate('/driver/vehicles');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} vehicle: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const isPending = isLoading;
  const watchedCapacity = form.watch("capacity");
  const watchedVehicleType = form.watch("vehicle_type");

  if (isEditing && !currentVehicle && vehicles && vehicles.length > 0) {
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="seatLayout">Seat Layout</TabsTrigger>
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

          {/* Seat Layout */}
          <TabsContent value="seatLayout" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="premium-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
                        <Grid3X3 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="font-heading text-lg">Seat Layout Configuration</CardTitle>
                        <p className="text-sm text-muted-foreground">Customize your vehicle's seat arrangement</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SeatLayoutEditor
                      seatMap={customSeatMap || generateBasicSeatMap(watchedCapacity, watchedVehicleType)}
                      onSeatMapChange={setCustomSeatMap}
                      capacity={watchedCapacity}
                      vehicleType={watchedVehicleType}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <SeatMapPreview capacity={watchedCapacity} vehicleType={watchedVehicleType} />
                
                {/* Current Layout Summary */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium">Current Layout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total Seats:</span>
                      <span className="font-medium">
                        {customSeatMap 
                          ? customSeatMap.layout.reduce((total, row) => total + row.seats.filter(s => s.type !== 'empty').length, 0)
                          : watchedCapacity
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Regular Seats:</span>
                      <span className="font-medium">
                        {customSeatMap 
                          ? customSeatMap.layout.reduce((total, row) => total + row.seats.filter(s => s.type === 'regular').length, 0)
                          : watchedCapacity
                        }
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Disabled Seats:</span>
                      <span className="font-medium">
                        {customSeatMap 
                          ? customSeatMap.layout.reduce((total, row) => total + row.seats.filter(s => s.type === 'disabled').length, 0)
                          : 0
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
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