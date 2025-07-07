import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export type BookingConfirmationData = {
  bookingId: string;
  email: string;
  passengerName: string;
  bookingReference: string;
  trip: {
    routeTemplateName: string;
    departureTime: string;
    arrivalTime: string;
    driverName: string;
    driverRating: number;
    vehicleInfo?: {
      make: string;
      model: string;
      year: number;
    };
  };
  bookingDetails: {
    selectedSeats: string[];
    numberOfBags: number;
    totalPrice: number;
    passengerPhone?: string;
  };
};

export const useSendBookingConfirmation = () => {
  return useMutation(api.bookingConfirmation.sendBookingConfirmation);
}; 