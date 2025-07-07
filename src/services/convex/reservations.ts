import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { DriverReservation, ReservationStats } from "../../../convex/reservations";

// Hook for getting driver reservations
export const useDriverReservations = (filters?: {
  status?: string;
  tripId?: string;
}) => {
  return useQuery(api.reservations.getDriverReservations, filters || {});
};

// Hook for getting driver reservation stats
export const useDriverReservationStats = () => {
  return useQuery(api.reservations.getDriverReservationStats);
};

// Hook for getting a specific reservation
export const useReservationById = (reservationId: Id<"reservations">) => {
  return useQuery(api.reservations.getReservationById, { reservationId });
};

// Hook for getting reservations for a specific trip
export const useTripReservations = (tripId: Id<"trips">) => {
  return useQuery(api.reservations.getTripReservations, { tripId });
};

// Hook for updating reservation status
export const useUpdateReservationStatus = () => {
  return useMutation(api.reservations.updateReservationStatus);
};

// Export types
export type { DriverReservation, ReservationStats };