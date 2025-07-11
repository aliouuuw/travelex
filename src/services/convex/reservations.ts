import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  DriverReservation,
  ReservationStats,
} from "../../../convex/reservations";
import { useAuth } from "@/hooks/use-auth";

// Hook for getting driver reservations
export const useDriverReservations = (filters?: {
  status?: string;
  tripId?: string;
}) => {
  const { user } = useAuth();
  return useQuery(
    api.reservations.getDriverReservations,
    user?.profile?.role === "driver" || user?.profile?.role === "admin"
      ? filters || {}
      : "skip",
  );
};

// Hook for getting driver reservation stats
export const useDriverReservationStats = () => {
  const { user } = useAuth();
  return useQuery(
    api.reservations.getDriverReservationStats,
    user?.profile?.role === "driver" || user?.profile?.role === "admin"
      ? {}
      : "skip",
  );
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
