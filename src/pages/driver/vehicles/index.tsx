import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Star, 
  AlertTriangle,
  Calendar,
  Gauge,
  Fuel,
  Users,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDriverVehicles,
  deleteVehicle,
  setDefaultVehicle,
  formatVehicleName,
  getVehicleTypeLabel,
  getFuelTypeLabel,
  getStatusInfo,
  isMaintenanceDue,
  isInsuranceExpiring,
  isRegistrationExpiring,
  type Vehicle
} from "@/services/vehicles";
import { toast } from "sonner";

const VehicleCard = ({ vehicle }: { vehicle: Vehicle }) => {
  const queryClient = useQueryClient();
  const statusInfo = getStatusInfo(vehicle.status);
  
  const maintenanceDue = isMaintenanceDue(vehicle);
  const insuranceExpiring = isInsuranceExpiring(vehicle);
  const registrationExpiring = isRegistrationExpiring(vehicle);
  
  const hasWarnings = maintenanceDue || insuranceExpiring || registrationExpiring;

  const { mutate: deleteVehicleMutation, isPending: isDeleting } = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      toast.success("Vehicle deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete vehicle");
    },
  });

  const { mutate: setDefaultMutation, isPending: isSettingDefault } = useMutation({
    mutationFn: setDefaultVehicle,
    onSuccess: () => {
      toast.success("Default vehicle updated!");
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to set default vehicle");
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${formatVehicleName(vehicle)}?`)) {
      deleteVehicleMutation(vehicle.id);
    }
  };

  const handleSetDefault = () => {
    setDefaultMutation(vehicle.id);
  };

  return (
    <Card className="premium-card hover:shadow-premium-hover transition-all group">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    {formatVehicleName(vehicle)}
                  </h3>
                  {vehicle.is_default && (
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {vehicle.license_plate}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasWarnings && (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
              <Badge className={statusInfo.color} variant="secondary">
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Car className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium">{getVehicleTypeLabel(vehicle.vehicle_type)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Fuel className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fuel</p>
                <p className="text-sm font-medium">{getFuelTypeLabel(vehicle.fuel_type)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Capacity</p>
                <p className="text-sm font-medium">{vehicle.capacity} seats</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Gauge className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mileage</p>
                <p className="text-sm font-medium">{vehicle.mileage.toLocaleString()} km</p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {hasWarnings && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">Attention Required</p>
              </div>
              {maintenanceDue && (
                <p className="text-xs text-amber-700">• Maintenance due soon</p>
              )}
              {insuranceExpiring && (
                <p className="text-xs text-amber-700">• Insurance expiring soon</p>
              )}
              {registrationExpiring && (
                <p className="text-xs text-amber-700">• Registration expiring soon</p>
              )}
            </div>
          )}

          {/* Features */}
          {vehicle.features && vehicle.features.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Features</p>
              <div className="flex flex-wrap gap-1">
                {vehicle.features.slice(0, 3).map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature.replace('_', ' ')}
                  </Badge>
                ))}
                {vehicle.features.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{vehicle.features.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Link to={`/driver/vehicles/edit/${vehicle.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            
            {!vehicle.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetDefault}
                disabled={isSettingDefault}
                className="flex-1"
              >
                <Star className="w-4 h-4 mr-2" />
                Set Default
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ['driver-vehicles'],
    queryFn: getDriverVehicles,
  });

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(vehicle =>
    formatVehicleName(vehicle).toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getVehicleTypeLabel(vehicle.vehicle_type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    needsAttention: vehicles.filter(v => 
      isMaintenanceDue(v) || isInsuranceExpiring(v) || isRegistrationExpiring(v)
    ).length,
  };

  if (error) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            Failed to load vehicles
          </h3>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            My Vehicles
          </h1>
          <p className="text-muted-foreground">
            Manage your vehicle fleet and configurations
          </p>
        </div>
        <Link to="/driver/vehicles/new">
          <Button className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all">
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Vehicles</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Need Attention</p>
                <p className="text-2xl font-bold text-foreground">{stats.needsAttention}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="premium-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search vehicles by name, license plate, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="premium-card">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-12">
          <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            {searchTerm ? 'No vehicles match your search' : 'No vehicles yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Add your first vehicle to get started with TravelEx'
            }
          </p>
          {!searchTerm && (
            <Link to="/driver/vehicles/new">
              <Button className="bg-brand-orange hover:bg-brand-orange-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Vehicle
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  );
} 