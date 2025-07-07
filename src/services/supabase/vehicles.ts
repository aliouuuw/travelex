import { supabase } from './supabase';

// Vehicle Types
export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vehicle_type: 'car' | 'van' | 'bus' | 'suv';
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  color?: string;
  capacity: number;
  seat_map?: SeatMap;
  features?: string[];
  status: 'active' | 'maintenance' | 'inactive';
  insurance_expiry?: string;
  registration_expiry?: string;
  last_maintenance?: string;
  mileage: number;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeatMap {
  rows: number;
  columns: number;
  layout: SeatRow[];
}

export interface SeatRow {
  row: number;
  seats: Seat[];
}

export interface Seat {
  id: string;
  row: number;
  column: number;
  type: 'regular' | 'disabled' | 'empty';
  available: boolean;
}

export interface CreateVehicleData {
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vehicle_type: 'car' | 'van' | 'bus' | 'suv';
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  color?: string;
  capacity: number;
  seat_map?: SeatMap;
  features?: string[];
  insurance_expiry?: string;
  registration_expiry?: string;
  last_maintenance?: string;
  mileage?: number;
  description?: string;
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {
  status?: 'active' | 'maintenance' | 'inactive';
  is_default?: boolean;
}

// Vehicle Options
export const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'van', label: 'Van' },
  { value: 'bus', label: 'Bus' },
  { value: 'suv', label: 'SUV' },
] as const;

export const FUEL_TYPES = [
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
] as const;

export const VEHICLE_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export const VEHICLE_FEATURES = [
  { value: 'air_conditioning', label: 'Air Conditioning' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'usb_charging', label: 'USB Charging' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'gps', label: 'GPS Navigation' },
  { value: 'entertainment', label: 'Entertainment System' },
  { value: 'seat_belts', label: 'Seat Belts' },
  { value: 'first_aid', label: 'First Aid Kit' },
  { value: 'fire_extinguisher', label: 'Fire Extinguisher' },
  { value: 'phone_charger', label: 'Phone Charger' },
] as const;

// Service Functions

/**
 * Get all vehicles for the current driver
 */
export async function getDriverVehicles(): Promise<Vehicle[]> {
  try {
    const { data, error } = await supabase.rpc('get_driver_vehicles');
    
    if (error) {
      console.error('Error fetching driver vehicles:', error);
      throw new Error(error.message || 'Failed to fetch vehicles');
    }
    
    return data || [];
  } catch (error) {
    console.error('Service error in getDriverVehicles:', error);
    throw error;
  }
}

/**
 * Get vehicles for a specific driver (admin use)
 */
export async function getDriverVehiclesByDriverId(driverId: string): Promise<Vehicle[]> {
  try {
    const { data, error } = await supabase.rpc('get_driver_vehicles', {
      driver_uuid: driverId
    });
    
    if (error) {
      console.error('Error fetching vehicles for driver:', error);
      throw new Error(error.message || 'Failed to fetch vehicles');
    }
    
    return data || [];
  } catch (error) {
    console.error('Service error in getDriverVehiclesByDriverId:', error);
    throw error;
  }
}

/**
 * Create a new vehicle
 */
export async function createVehicle(vehicleData: CreateVehicleData): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('create_vehicle', {
      p_make: vehicleData.make,
      p_model: vehicleData.model,
      p_year: vehicleData.year,
      p_license_plate: vehicleData.license_plate,
      p_vehicle_type: vehicleData.vehicle_type,
      p_fuel_type: vehicleData.fuel_type,
      p_color: vehicleData.color || null,
      p_capacity: vehicleData.capacity,
      p_seat_map: vehicleData.seat_map || null,
      p_features: vehicleData.features || null,
      p_insurance_expiry: vehicleData.insurance_expiry || null,
      p_registration_expiry: vehicleData.registration_expiry || null,
      p_last_maintenance: vehicleData.last_maintenance || null,
      p_mileage: vehicleData.mileage || 0,
      p_description: vehicleData.description || null,
    });
    
    if (error) {
      console.error('Error creating vehicle:', error);
      throw new Error(error.message || 'Failed to create vehicle');
    }
    
    return data;
  } catch (error) {
    console.error('Service error in createVehicle:', error);
    throw error;
  }
}

/**
 * Update an existing vehicle
 */
export async function updateVehicle(
  vehicleId: string, 
  vehicleData: UpdateVehicleData
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('update_vehicle', {
      p_vehicle_id: vehicleId,
      p_make: vehicleData.make || null,
      p_model: vehicleData.model || null,
      p_year: vehicleData.year || null,
      p_license_plate: vehicleData.license_plate || null,
      p_vehicle_type: vehicleData.vehicle_type || null,
      p_fuel_type: vehicleData.fuel_type || null,
      p_color: vehicleData.color || null,
      p_capacity: vehicleData.capacity || null,
      p_seat_map: vehicleData.seat_map || null,
      p_features: vehicleData.features || null,
      p_status: vehicleData.status || null,
      p_insurance_expiry: vehicleData.insurance_expiry || null,
      p_registration_expiry: vehicleData.registration_expiry || null,
      p_last_maintenance: vehicleData.last_maintenance || null,
      p_mileage: vehicleData.mileage || null,
      p_description: vehicleData.description || null,
      p_is_default: vehicleData.is_default || null,
    });
    
    if (error) {
      console.error('Error updating vehicle:', error);
      throw new Error(error.message || 'Failed to update vehicle');
    }
    
    return data;
  } catch (error) {
    console.error('Service error in updateVehicle:', error);
    throw error;
  }
}

/**
 * Delete a vehicle
 */
export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('delete_vehicle', {
      p_vehicle_id: vehicleId
    });
    
    if (error) {
      console.error('Error deleting vehicle:', error);
      throw new Error(error.message || 'Failed to delete vehicle');
    }
    
    return data;
  } catch (error) {
    console.error('Service error in deleteVehicle:', error);
    throw error;
  }
}

/**
 * Set a vehicle as default
 */
export async function setDefaultVehicle(vehicleId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('set_default_vehicle', {
      p_vehicle_id: vehicleId
    });
    
    if (error) {
      console.error('Error setting default vehicle:', error);
      throw new Error(error.message || 'Failed to set default vehicle');
    }
    
    return data;
  } catch (error) {
    console.error('Service error in setDefaultVehicle:', error);
    throw error;
  }
}

// Utility Functions

/**
 * Generate a basic seat map for a vehicle
 */
export function generateBasicSeatMap(capacity: number, vehicleType: string): SeatMap {
  const seats: Seat[] = [];
  let rows = 0;
  let columns = 0;

  // Determine layout based on vehicle type and capacity
  switch (vehicleType) {
    case 'car':
      rows = capacity <= 5 ? 2 : 3;
      columns = capacity <= 5 ? 3 : 4;
      break;
    case 'van':
      rows = Math.ceil(capacity / 4);
      columns = 4;
      break;
    case 'bus':
      rows = Math.ceil(capacity / 4);
      columns = 4;
      break;
    case 'suv':
      rows = capacity <= 7 ? 3 : 4;
      columns = capacity <= 7 ? 3 : 4;
      break;
    default:
      rows = Math.ceil(capacity / 4);
      columns = 4;
  }

  // Generate seats
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= columns; col++) {
      const seatNumber = seats.length + 1;
      if (seatNumber <= capacity) {
        seats.push({
          id: `${row}${String.fromCharCode(64 + col)}`,
          row,
          column: col,
          type: 'regular',
          available: true,
        });
      }
    }
  }

  // Group seats by rows
  const seatRows: SeatRow[] = [];
  for (let row = 1; row <= rows; row++) {
    const rowSeats = seats.filter(seat => seat.row === row);
    if (rowSeats.length > 0) {
      seatRows.push({
        row,
        seats: rowSeats,
      });
    }
  }

  return {
    rows,
    columns,
    layout: seatRows,
  };
}

/**
 * Format vehicle display name
 */
export function formatVehicleName(vehicle: Vehicle): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

/**
 * Get vehicle type label
 */
export function getVehicleTypeLabel(type: string): string {
  const vehicleType = VEHICLE_TYPES.find(vt => vt.value === type);
  return vehicleType?.label || type;
}

/**
 * Get fuel type label
 */
export function getFuelTypeLabel(type: string): string {
  const fuelType = FUEL_TYPES.find(ft => ft.value === type);
  return fuelType?.label || type;
}

/**
 * Get status label and color
 */
export function getStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'text-green-600 bg-green-100' };
    case 'maintenance':
      return { label: 'Under Maintenance', color: 'text-yellow-600 bg-yellow-100' };
    case 'inactive':
      return { label: 'Inactive', color: 'text-gray-600 bg-gray-100' };
    default:
      return { label: status, color: 'text-gray-600 bg-gray-100' };
  }
}

/**
 * Check if maintenance is due soon
 */
export function isMaintenanceDue(vehicle: Vehicle, warningDays: number = 30): boolean {
  if (!vehicle.last_maintenance) return false;
  
  const lastMaintenance = new Date(vehicle.last_maintenance);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);
  
  // Assume maintenance every 6 months
  const nextMaintenance = new Date(lastMaintenance);
  nextMaintenance.setMonth(nextMaintenance.getMonth() + 6);
  
  return nextMaintenance <= warningDate;
}

/**
 * Check if insurance is expiring soon
 */
export function isInsuranceExpiring(vehicle: Vehicle, warningDays: number = 30): boolean {
  if (!vehicle.insurance_expiry) return false;
  
  const expiryDate = new Date(vehicle.insurance_expiry);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);
  
  return expiryDate <= warningDate;
}

/**
 * Check if registration is expiring soon
 */
export function isRegistrationExpiring(vehicle: Vehicle, warningDays: number = 30): boolean {
  if (!vehicle.registration_expiry) return false;
  
  const expiryDate = new Date(vehicle.registration_expiry);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);
  
  return expiryDate <= warningDate;
} 