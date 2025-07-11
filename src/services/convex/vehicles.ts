import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";

// Vehicle Types
export interface Vehicle {
  _id: Id<"vehicles">;
  driverId: Id<"profiles">;
  make: string;
  model: string;
  year?: number;
  licensePlate?: string;
  type?: string;
  fuelType?: string;
  color?: string;
  capacity: number;
  seatMap?: SeatMap;
  features?: string[];
  status: "active" | "maintenance" | "inactive";
  isDefault?: boolean;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  lastMaintenance?: string;
  mileage?: number;
  description?: string;
  _creationTime: number;
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
  type: "regular" | "disabled" | "empty";
  available: boolean;
}

export interface CreateVehicleData {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vehicleType: "car" | "van" | "bus" | "suv";
  fuelType: "gasoline" | "diesel" | "electric" | "hybrid";
  color?: string;
  capacity: number;
  seatMap?: SeatMap;
  features?: string[];
  insuranceExpiry?: string;
  registrationExpiry?: string;
  lastMaintenance?: string;
  mileage?: number;
  description?: string;
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {
  status?: "active" | "maintenance" | "inactive";
  isDefault?: boolean;
}

// Vehicle Options
export const VEHICLE_TYPES = [
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "bus", label: "Bus" },
  { value: "suv", label: "SUV" },
] as const;

export const FUEL_TYPES = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
] as const;

export const VEHICLE_STATUS = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Under Maintenance" },
  { value: "inactive", label: "Inactive" },
] as const;

export const VEHICLE_FEATURES = [
  { value: "air_conditioning", label: "Air Conditioning" },
  { value: "wifi", label: "WiFi" },
  { value: "usb_charging", label: "USB Charging" },
  { value: "bluetooth", label: "Bluetooth" },
  { value: "gps", label: "GPS Navigation" },
  { value: "entertainment", label: "Entertainment System" },
  { value: "seat_belts", label: "Seat Belts" },
  { value: "first_aid", label: "First Aid Kit" },
  { value: "fire_extinguisher", label: "Fire Extinguisher" },
  { value: "phone_charger", label: "Phone Charger" },
] as const;

// React hooks for vehicles
export const useDriverVehicles = () => {
  const { user } = useAuth();
  return useQuery(
    api.vehicles.getDriverVehicles,
    user?.profile?.role === "driver" || user?.profile?.role === "admin"
      ? {}
      : "skip",
  );
};

export const useVehicleById = (vehicleId: Id<"vehicles">) => {
  return useQuery(api.vehicles.getVehicleById, { vehicleId });
};

export const useCreateVehicle = () => {
  return useMutation(api.vehicles.createVehicle);
};

export const useUpdateVehicle = () => {
  return useMutation(api.vehicles.updateVehicle);
};

export const useDeleteVehicle = () => {
  return useMutation(api.vehicles.deleteVehicle);
};

export const useSetDefaultVehicle = () => {
  return useMutation(api.vehicles.setDefaultVehicle);
};

// Service Functions (for compatibility with existing code)

/**
 * Get all vehicles for the current driver
 */
export async function getDriverVehicles(): Promise<Vehicle[]> {
  throw new Error("Use useDriverVehicles hook instead");
}

/**
 * Get vehicles for a specific driver (admin use)
 */
// export async function getDriverVehiclesByDriverId(driverId: string): Promise<Vehicle[]> {
//   throw new Error('Use useQuery with getVehiclesByDriverId instead');
// }

// /**
//  * Create a new vehicle
//  */
// export async function createVehicle(vehicleData: CreateVehicleData): Promise<Id<"vehicles">> {
//   throw new Error('Use useCreateVehicle hook instead');
// }

// /**
//  * Update an existing vehicle
//  */
// export async function updateVehicle(
//   vehicleId: Id<"vehicles">,
//   vehicleData: UpdateVehicleData
// ): Promise<boolean> {
//   throw new Error('Use useUpdateVehicle hook instead');
// }

// /**
//  * Delete a vehicle
//  */
// export async function deleteVehicle(vehicleId: Id<"vehicles">): Promise<boolean> {
//   throw new Error('Use useDeleteVehicle hook instead');
// }

/**
 * Set default vehicle
 */
// export async function setDefaultVehicle(vehicleId: Id<"vehicles">): Promise<boolean> {
//   throw new Error('Use useSetDefaultVehicle hook instead');
// }

// Utility functions
export function generateBasicSeatMap(
  capacity: number,
  vehicleType: string,
): SeatMap {
  let rows: number;
  let columns: number;

  switch (vehicleType) {
    case "car":
      rows = Math.ceil(capacity / 2);
      columns = capacity <= 2 ? capacity : 2;
      break;
    case "van":
      rows = Math.ceil(capacity / 3);
      columns = capacity <= 3 ? capacity : 3;
      break;
    case "bus":
      rows = Math.ceil(capacity / 4);
      columns = capacity <= 4 ? capacity : 4;
      break;
    case "suv":
      rows = Math.ceil(capacity / 3);
      columns = capacity <= 3 ? capacity : 3;
      break;
    default:
      rows = Math.ceil(capacity / 2);
      columns = capacity <= 2 ? capacity : 2;
  }

  const layout: SeatRow[] = [];

  for (let row = 1; row <= rows; row++) {
    const seats: Seat[] = [];
    const seatsInThisRow = Math.min(columns, capacity - (row - 1) * columns);

    for (let col = 1; col <= seatsInThisRow; col++) {
      seats.push({
        id: `${row}-${col}`,
        row,
        column: col,
        type: "regular",
        available: true,
      });
    }

    layout.push({ row, seats });
  }

  return { rows, columns, layout };
}

export function formatVehicleName(vehicle: Vehicle): string {
  return `${vehicle.make} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ""}`;
}

export function getVehicleTypeLabel(type: string): string {
  const vehicleType = VEHICLE_TYPES.find((t) => t.value === type);
  return vehicleType?.label || type;
}

export function getFuelTypeLabel(type: string): string {
  const fuelType = FUEL_TYPES.find((t) => t.value === type);
  return fuelType?.label || type;
}

export function getStatusInfo(status: string): {
  label: string;
  color: string;
} {
  switch (status) {
    case "active":
      return { label: "Active", color: "green" };
    case "maintenance":
      return { label: "Under Maintenance", color: "yellow" };
    case "inactive":
      return { label: "Inactive", color: "red" };
    default:
      return { label: status, color: "gray" };
  }
}

export function isMaintenanceDue(
  vehicle: Vehicle,
  warningDays: number = 30,
): boolean {
  if (!vehicle.lastMaintenance) return true;

  const lastMaintenance = new Date(vehicle.lastMaintenance);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() - warningDays);

  return lastMaintenance < warningDate;
}

export function isInsuranceExpiring(
  vehicle: Vehicle,
  warningDays: number = 30,
): boolean {
  if (!vehicle.insuranceExpiry) return false;

  const expiryDate = new Date(vehicle.insuranceExpiry);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);

  return expiryDate < warningDate;
}

export function isRegistrationExpiring(
  vehicle: Vehicle,
  warningDays: number = 30,
): boolean {
  if (!vehicle.registrationExpiry) return false;

  const expiryDate = new Date(vehicle.registrationExpiry);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);

  return expiryDate < warningDate;
}
