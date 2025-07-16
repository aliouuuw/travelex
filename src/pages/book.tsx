import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Star,
  Car,
  Package,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTripForBooking } from "@/services/convex/tripSearch";
import {
  useCreatePaymentIntent,
  useCreateRoundTripPaymentIntent,
} from "@/services/convex/payments";
import type { SeatMap } from "@/services/convex/vehicles";
import type { TripSearchResult } from "@/services/convex/tripSearch";

interface BookingFormData {
  pickupStationId: string;
  dropoffStationId: string;
  selectedSeats: string[];
  numberOfBags: number; // Changed from luggageWeight to numberOfBags
  passengerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  // NEW: Optional round trip fields
  returnTrip?: {
    pickupStationId: string;
    dropoffStationId: string;
    selectedSeats: string[];
    numberOfBags: number;
  };
}

const LuggageSelector = ({
  policy,
  selectedSeats,
  numberOfBags,
  onBagsChange,
  tripTitle,
  titleColor = "text-gray-900",
}: {
  policy: TripSearchResult["luggagePolicy"];
  selectedSeats: number;
  numberOfBags: number;
  onBagsChange: (newCount: number) => void;
  tripTitle: string;
  titleColor?: string;
}) => {
  if (selectedSeats === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          Select seats to manage luggage for the {tripTitle.toLowerCase()}.
        </p>
      </div>
    );
  }

  const freeBags = selectedSeats;
  const additionalBags = Math.max(0, numberOfBags - freeBags);
  const feePerBag = policy?.excessFeePerKg || 0;
  const maxBags = (policy?.maxBags || 4) * selectedSeats + freeBags;
  const luggageFee = additionalBags * feePerBag;

  return (
    <div className="space-y-4 p-6 rounded-lg border bg-white">
      <h4 className={`font-semibold text-lg ${titleColor}`}>{tripTitle}</h4>
      {policy ? (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-2">
                Luggage Policy (per passenger)
              </h4>
              <div className="text-sm text-green-800 space-y-1">
                <p>
                  • <strong>1 free bag</strong> up to{" "}
                  {policy.freeWeightKg || 23}kg
                </p>
                <p>
                  • Additional bags:{" "}
                  <strong>
                    ${(policy.excessFeePerKg || 5).toFixed(2)} each
                  </strong>{" "}
                  (max {policy.maxBags || 4} per passenger)
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 text-sm">
            No specific luggage policy available.
          </p>
        </div>
      )}

      <div>
        <Label className="text-sm font-medium mb-3 block">Total Bags</Label>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onBagsChange(Math.max(freeBags, numberOfBags - 1))}
            disabled={numberOfBags <= freeBags}
            className="w-10 h-10 p-0"
          >
            -
          </Button>
          <div className="text-center min-w-[80px]">
            <div className="text-2xl font-bold text-brand-orange">
              {numberOfBags}
            </div>
            <div className="text-xs text-muted-foreground">
              {numberOfBags === freeBags
                ? `${freeBags} bag${freeBags > 1 ? "s" : ""} (all free)`
                : `${freeBags} free + ${additionalBags} additional`}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onBagsChange(Math.min(maxBags, numberOfBags + 1))}
            disabled={numberOfBags >= maxBags}
            className="w-10 h-10 p-0"
          >
            +
          </Button>
        </div>

        {luggageFee > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex justify-between items-center">
              <span>
                Additional luggage fee ({additionalBags} bag
                {additionalBags > 1 ? "s" : ""})
              </span>
              <span className="font-semibold text-brand-orange">
                ${luggageFee.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Visual Seat Selection Component
const SeatSelectionGrid = ({
  seatMap,
  selectedSeats,
  onSeatSelect,
  occupiedSeats = [],
}: {
  seatMap: SeatMap;
  selectedSeats: string[];
  onSeatSelect: (seatId: string) => void;
  occupiedSeats?: string[];
}) => {
  if (!seatMap || !seatMap.layout) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Seat map not available for this vehicle
          </p>
        </div>
      </div>
    );
  }

  const getSeatStatus = (seatId: string) => {
    if (occupiedSeats.includes(seatId)) return "occupied";
    if (selectedSeats.includes(seatId)) return "selected";
    return "available";
  };

  const getSeatClassName = (status: string, seatType?: string) => {
    const baseClasses =
      "w-10 h-10 border-2 rounded text-xs font-bold flex items-center justify-center transition-all duration-200";

    // If seat is disabled or empty, show as unavailable
    if (seatType === "disabled" || seatType === "empty") {
      return `${baseClasses} bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-50`;
    }

    switch (status) {
      case "occupied":
        return `${baseClasses} bg-red-100 border-red-300 text-red-700 cursor-not-allowed`;
      case "selected":
        return `${baseClasses} bg-brand-orange border-brand-orange text-white cursor-pointer`;
      case "available":
        return `${baseClasses} bg-green-100 border-green-300 text-green-700 cursor-pointer hover:bg-green-200`;
      default:
        return `${baseClasses} bg-gray-100 border-gray-300 text-gray-500`;
    }
  };

  return (
    <div className="space-y-4 flex flex-col justify-center items-center">
      {/* Vehicle Front Indicator */}
      <div className="flex justify-center mb-6">
        <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
          Front of Vehicle
        </div>
      </div>

      {/* Seat Grid */}
      <div className="space-y-2 max-w-md mx-auto">
        {seatMap.layout.map((row: SeatMap["layout"][number]) => (
          <div key={row.row} className="flex gap-2">
            {row.seats.map(
              (seat: SeatMap["layout"][number]["seats"][number]) => {
                const status = getSeatStatus(seat.id);
                const isClickable =
                  status !== "occupied" &&
                  seat.type !== "disabled" &&
                  seat.type !== "empty";

                return (
                  <div
                    key={seat.id}
                    className={`relative ${seat.type === "empty" ? "invisible" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => isClickable && onSeatSelect(seat.id)}
                      disabled={!isClickable}
                      className={getSeatClassName(status, seat.type)}
                      title={
                        seat.type === "disabled"
                          ? "Not Available"
                          : seat.type === "empty"
                            ? "Empty Space"
                            : "Regular Seat"
                      }
                    >
                      {seat.type === "empty" ? "·" : seat.id}
                    </button>
                  </div>
                );
              },
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 pt-4 border-t flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded"></div>
          <span className="text-sm text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-orange border-2 border-brand-orange rounded"></div>
          <span className="text-sm text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded"></div>
          <span className="text-sm text-muted-foreground">Occupied</span>
        </div>
      </div>
    </div>
  );
};

// Main Booking Page Component
export default function BookingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  // Get search context from URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const searchFromCity = searchParams.get("fromCity");
  const searchToCity = searchParams.get("toCity");
  const fromStationId = searchParams.get("fromStation");
  const toStationId = searchParams.get("toStation");
  const passengersStr = searchParams.get("passengers");
  const requestedPassengers = passengersStr ? parseInt(passengersStr) : 1;

  // NEW: Round trip detection
  const returnTripId = searchParams.get("returnTripId");
  const isRoundTrip = !!returnTripId;

  // Form state - skip station selection if stations are pre-selected
  const hasPreSelectedStations = fromStationId && toStationId;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(
    hasPreSelectedStations ? 1 : 1,
  ); // Always start at step 1 (seat selection)

  const [formData, setFormData] = useState<BookingFormData>({
    pickupStationId: fromStationId || "",
    dropoffStationId: toStationId || "",
    selectedSeats: [],
    numberOfBags: 1, // Will be updated when seats are selected
    passengerInfo: {
      fullName: "",
      email: "",
      phone: "",
    },
    // NEW: Initialize return trip data for round trips
    ...(isRoundTrip && {
      returnTrip: {
        pickupStationId: toStationId || "", // Return pickup is original dropoff
        dropoffStationId: fromStationId || "", // Return dropoff is original pickup
        selectedSeats: [],
        numberOfBags: 1,
      },
    }),
  });

  // Fetch trip details using Convex
  const trip = useTripForBooking(tripId || "");
  const isLoading = trip === undefined && !!tripId;
  const error = null; // Convex handles errors differently

  // NEW: Fetch return trip data conditionally
  const returnTrip = useTripForBooking(returnTripId || "");
  const returnLoading = returnTrip === undefined && !!returnTripId;

  // Find the actual station objects for display
  const pickupStation = useMemo(() => {
    if (!trip || !fromStationId || !searchFromCity) return null;

    // Try multiple matching strategies
    let station = trip.tripStations.find(
      (s) => s.stationName === fromStationId && s.cityName === searchFromCity,
    );

    // If not found, try case-insensitive matching
    if (!station) {
      station = trip.tripStations.find(
        (s) =>
          s.stationName.toLowerCase() === fromStationId.toLowerCase() &&
          s.cityName.toLowerCase() === searchFromCity.toLowerCase(),
      );
    }

    // If still not found, try matching just by city name
    if (!station) {
      station = trip.tripStations.find(
        (s) =>
          s.cityName.toLowerCase() === searchFromCity.toLowerCase() &&
          s.isPickupPoint,
      );
    }

    console.log("Pickup station search:", {
      fromStationId,
      searchFromCity,
      found: !!station,
      stationFound: station,
      allStations: trip.tripStations.map((s) => ({
        id: s.id,
        name: s.stationName,
        city: s.cityName,
        isPickup: s.isPickupPoint,
        isDropoff: s.isDropoffPoint,
      })),
    });
    return station;
  }, [trip, fromStationId, searchFromCity]);

  const dropoffStation = useMemo(() => {
    if (!trip || !toStationId || !searchToCity) return null;

    // Try multiple matching strategies
    let station = trip.tripStations.find(
      (s) => s.stationName === toStationId && s.cityName === searchToCity,
    );

    // If not found, try case-insensitive matching
    if (!station) {
      station = trip.tripStations.find(
        (s) =>
          s.stationName.toLowerCase() === toStationId.toLowerCase() &&
          s.cityName.toLowerCase() === searchToCity.toLowerCase(),
      );
    }

    // If still not found, try matching just by city name
    if (!station) {
      station = trip.tripStations.find(
        (s) =>
          s.cityName.toLowerCase() === searchToCity.toLowerCase() &&
          s.isDropoffPoint,
      );
    }

    console.log("Dropoff station search:", {
      toStationId,
      searchToCity,
      found: !!station,
      stationFound: station,
      allStations: trip.tripStations.map((s) => ({
        id: s.id,
        name: s.stationName,
        city: s.cityName,
        isPickup: s.isPickupPoint,
        isDropoff: s.isDropoffPoint,
      })),
    });
    return station;
  }, [trip, toStationId, searchToCity]);

  // Map station names to IDs when trip data is available
  useMemo(() => {
    if (pickupStation && dropoffStation) {
      setFormData((prev) => ({
        ...prev,
        pickupStationId: pickupStation.id,
        dropoffStationId: dropoffStation.id,
      }));
    }
  }, [pickupStation, dropoffStation]);

  // Calculate pricing based on city names from search context
  const segmentPrice = useMemo(() => {
    if (!trip || !searchFromCity || !searchToCity) return 0;

    // First try to find exact match in pricing array
    let pricingSegment = trip.pricing.find(
      (p) =>
        p.fromCity.toLowerCase() === searchFromCity.toLowerCase() &&
        p.toCity.toLowerCase() === searchToCity.toLowerCase(),
    );

    // If no exact match, try case-insensitive partial match
    if (!pricingSegment) {
      pricingSegment = trip.pricing.find(
        (p) =>
          p.fromCity.toLowerCase().includes(searchFromCity.toLowerCase()) &&
          p.toCity.toLowerCase().includes(searchToCity.toLowerCase()),
      );
    }

    return pricingSegment?.price || 50; // fallback price
  }, [trip, searchFromCity, searchToCity]);

  // NEW: Calculate return trip pricing
  const returnSegmentPrice = useMemo(() => {
    if (!isRoundTrip || !returnTrip || !searchFromCity || !searchToCity)
      return 0;

    // Return trip is from searchToCity to searchFromCity (reversed)
    let pricingSegment = returnTrip.pricing.find(
      (p) =>
        p.fromCity.toLowerCase() === searchToCity.toLowerCase() &&
        p.toCity.toLowerCase() === searchFromCity.toLowerCase(),
    );

    if (!pricingSegment) {
      pricingSegment = returnTrip.pricing.find(
        (p) =>
          p.fromCity.toLowerCase().includes(searchToCity.toLowerCase()) &&
          p.toCity.toLowerCase().includes(searchFromCity.toLowerCase()),
      );
    }

    return pricingSegment?.price || segmentPrice; // fallback to outbound price
  }, [isRoundTrip, returnTrip, searchFromCity, searchToCity, segmentPrice]);

  const luggageFee = useMemo(() => {
    if (!trip?.luggagePolicy) {
      return 0;
    }

    // If no seats are selected, no luggage fee should apply
    if (formData.selectedSeats.length === 0) {
      return 0;
    }

    // Calculate fee for additional bags beyond the free allowance
    const totalFreeBags = formData.selectedSeats.length; // 1 free bag per passenger
    const additionalBags = Math.max(0, formData.numberOfBags - totalFreeBags);
    const feePerBag = trip.luggagePolicy.excessFeePerKg || 0; // This now represents fee per bag
    return additionalBags * feePerBag;
  }, [trip, formData.numberOfBags, formData.selectedSeats.length]);

  // NEW: Calculate return trip luggage fee
  const returnLuggageFee = useMemo(() => {
    if (!isRoundTrip || !returnTrip?.luggagePolicy || !formData.returnTrip) {
      return 0;
    }

    if (formData.returnTrip.selectedSeats.length === 0) {
      return 0;
    }

    const totalFreeBags = formData.returnTrip.selectedSeats.length;
    const additionalBags = Math.max(
      0,
      formData.returnTrip.numberOfBags - totalFreeBags,
    );
    const feePerBag = returnTrip.luggagePolicy.excessFeePerKg || 0;
    return additionalBags * feePerBag;
  }, [isRoundTrip, returnTrip, formData.returnTrip]);

  const totalPrice = isRoundTrip
    ? segmentPrice * formData.selectedSeats.length +
      luggageFee +
      (returnSegmentPrice * (formData.returnTrip?.selectedSeats.length || 0) +
        returnLuggageFee)
    : segmentPrice * formData.selectedSeats.length + luggageFee;

  // Handle form updates
  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSeatSelect = (
    seatId: string,
    tripType: "outbound" | "return",
  ) => {
    if (tripType === "return" && formData.returnTrip) {
      // Handle return trip seat selection
      const currentReturnSeats = formData.returnTrip.selectedSeats || [];
      const isSelected = currentReturnSeats.includes(seatId);

      let newSelectedSeats;
      if (isSelected) {
        newSelectedSeats = currentReturnSeats.filter((id) => id !== seatId);
      } else {
        // Check if we're at the passenger limit
        if (currentReturnSeats.length >= requestedPassengers) {
          toast.error(
            `You can only select up to ${requestedPassengers} seat${requestedPassengers > 1 ? "s" : ""} for your return trip`,
          );
          return;
        }
        newSelectedSeats = [...currentReturnSeats, seatId];
      }

      updateFormData({
        returnTrip: {
          ...formData.returnTrip,
          selectedSeats: newSelectedSeats,
          numberOfBags:
            newSelectedSeats.length === 0 ? 1 : newSelectedSeats.length,
        },
      });
    } else if (tripType === "outbound") {
      // Handle outbound trip seat selection
      const isSelected = formData.selectedSeats.includes(seatId);
      let newSelectedSeats;
      if (isSelected) {
        newSelectedSeats = formData.selectedSeats.filter((id) => id !== seatId);
      } else {
        // Check if we're at the passenger limit
        if (formData.selectedSeats.length >= requestedPassengers) {
          toast.error(
            `You can only select up to ${requestedPassengers} seat${requestedPassengers > 1 ? "s" : ""} for your outbound trip`,
          );
          return;
        }
        newSelectedSeats = [...formData.selectedSeats, seatId];
      }
      updateFormData({
        selectedSeats: newSelectedSeats,
        numberOfBags:
          newSelectedSeats.length === 0 ? 1 : newSelectedSeats.length,
      });
    }
  };

  // Create payment intent action
  const createPaymentIntent = useCreatePaymentIntent();
  const createRoundTripPaymentIntent = useCreateRoundTripPaymentIntent();
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const handleSubmit = async () => {
    if (!trip) {
      toast.error("Trip data not available");
      return;
    }

    if (isRoundTrip && !returnTrip) {
      toast.error("Return trip data not available");
      return;
    }

    setIsCreatingPayment(true);

    try {
      let response;

      if (isRoundTrip && formData.returnTrip) {
        // Round trip payment
        const roundTripPaymentData = {
          outboundBooking: {
            tripId: trip.tripId,
            pickupStationId: formData.pickupStationId,
            dropoffStationId: formData.dropoffStationId,
            selectedSeats: formData.selectedSeats,
            numberOfBags: formData.numberOfBags,
            totalPrice:
              segmentPrice * formData.selectedSeats.length + luggageFee,
            passengerInfo: {
              fullName: formData.passengerInfo.fullName,
              email: formData.passengerInfo.email,
              phone: formData.passengerInfo.phone || "",
            },
          },
          returnBooking: {
            tripId: returnTrip!.tripId,
            pickupStationId: formData.returnTrip.pickupStationId,
            dropoffStationId: formData.returnTrip.dropoffStationId,
            selectedSeats: formData.returnTrip.selectedSeats,
            numberOfBags: formData.returnTrip.numberOfBags,
            totalPrice:
              returnSegmentPrice * formData.returnTrip.selectedSeats.length +
              returnLuggageFee,
            passengerInfo: {
              fullName: formData.passengerInfo.fullName,
              email: formData.passengerInfo.email,
              phone: formData.passengerInfo.phone || "",
            },
          },
          totalAmount: totalPrice,
          discountAmount: 0,
        };
        response = await createRoundTripPaymentIntent(roundTripPaymentData);
      } else {
        // One-way payment
        const oneWayPaymentData = {
          tripId: trip.tripId,
          passengerInfo: {
            fullName: formData.passengerInfo.fullName,
            email: formData.passengerInfo.email,
            phone: formData.passengerInfo.phone || "",
          },
          pickupStationId: formData.pickupStationId,
          dropoffStationId: formData.dropoffStationId,
          selectedSeats: formData.selectedSeats,
          numberOfBags: formData.numberOfBags,
          totalPrice: totalPrice,
        };
        response = await createPaymentIntent(oneWayPaymentData);
      }

      toast.success("Redirecting to payment...");
      // Navigate to payment page with client secret
      const bookingId = isRoundTrip
        ? (response as { outboundTempId: string }).outboundTempId
        : (response as { tempBookingId: string }).tempBookingId;
      navigate(`/payment/${bookingId}?client_secret=${response.clientSecret}`);
    } catch (error) {
      toast.error(
        "Failed to create payment session: " + (error as Error).message,
      );
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Loading and error states
  if (isLoading || (isRoundTrip && returnLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
          <span className="text-lg text-muted-foreground">
            Loading trip details...
          </span>
        </div>
      </div>
    );
  }

  if (error || !trip || (isRoundTrip && !returnTrip)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Trip Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The trip you're looking for could not be found or is no longer
              available.
            </p>
            <Button asChild>
              <Link to="/search">Back to Search</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departureTime = new Date(trip.departureTime || "");
  const arrivalTime = new Date(trip.arrivalTime || "");

  // Validation for each step
  const canProceedFromStep1 = isRoundTrip
    ? formData.selectedSeats.length === requestedPassengers &&
      (formData.returnTrip?.selectedSeats.length || 0) === requestedPassengers
    : formData.selectedSeats.length === requestedPassengers;
  const canProceedFromStep2 = true; // Luggage is optional
  const canSubmit =
    formData.passengerInfo.fullName &&
    formData.passengerInfo.email &&
    formData.passengerInfo.phone;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/search")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-heading">Book Your Trip</h1>
            <p className="text-muted-foreground">
              {searchFromCity && searchToCity
                ? `${searchFromCity} → ${searchToCity} • Complete your booking in a few simple steps`
                : "Complete your booking in a few simple steps"}
            </p>
            {/* NEW: Round trip indicator */}
            {isRoundTrip && (
              <Badge
                variant="secondary"
                className="mt-2 bg-blue-100 text-blue-800"
              >
                Round Trip Booking
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {(hasPreSelectedStations ? [1, 2, 3] : [1, 2, 3]).map(
            (step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${
                  currentStep >= step
                    ? "bg-brand-orange text-white"
                    : "bg-gray-200 text-gray-500"
                }
              `}
                >
                  {currentStep > step ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                {index < 2 && (
                  <div
                    className={`w-12 h-0.5 ${currentStep > step ? "bg-brand-orange" : "bg-gray-200"}`}
                  />
                )}
              </div>
            ),
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentStep === 1 && (
                    <>
                      <Users className="w-5 h-5 text-brand-orange" /> Choose
                      Seats
                    </>
                  )}
                  {currentStep === 2 && (
                    <>
                      <Package className="w-5 h-5 text-brand-orange" /> Luggage
                      Options
                    </>
                  )}
                  {currentStep === 3 && (
                    <>
                      <CheckCircle className="w-5 h-5 text-brand-orange" />{" "}
                      Review & Book
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Station Summary - Always show since stations are pre-selected */}
                {hasPreSelectedStations && (
                  <div className="mb-6 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">
                        {isRoundTrip
                          ? "Round Trip Stations Selected"
                          : "Stations Selected"}
                      </span>
                    </div>

                    {isRoundTrip ? (
                      /* Round Trip: Show both outbound and return */
                      <div className="space-y-4">
                        {/* Outbound */}
                        <div className="p-3 bg-blue-50 rounded border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">
                            Outbound: {searchFromCity} → {searchToCity}
                          </h4>
                          {pickupStation && dropoffStation ? (
                            <div className="space-y-2 text-sm text-blue-700">
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <p className="font-medium">
                                    Pickup: {pickupStation?.stationName}
                                  </p>
                                  <p className="text-xs opacity-80">
                                    {pickupStation?.stationAddress}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <p className="font-medium">
                                    Dropoff: {dropoffStation?.stationName}
                                  </p>
                                  <p className="text-xs opacity-80">
                                    {dropoffStation?.stationAddress}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-blue-700">
                              Loading station details...
                            </p>
                          )}
                          <p className="text-sm font-bold text-blue-800 mt-2">
                            ${segmentPrice} per seat
                          </p>
                        </div>

                        {/* Return */}
                        <div className="p-3 bg-green-50 rounded border border-green-200">
                          <h4 className="font-medium text-green-900 mb-2">
                            Return: {searchToCity} → {searchFromCity}
                          </h4>
                          {pickupStation && dropoffStation ? (
                            <div className="space-y-2 text-sm text-green-700">
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <p className="font-medium">
                                    Pickup: {dropoffStation?.stationName}
                                  </p>
                                  <p className="text-xs opacity-80">
                                    {dropoffStation?.stationAddress}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <p className="font-medium">
                                    Dropoff: {pickupStation?.stationName}
                                  </p>
                                  <p className="text-xs opacity-80">
                                    {pickupStation?.stationAddress}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-green-700">
                              Loading station details...
                            </p>
                          )}
                          <p className="text-sm font-bold text-green-800 mt-2">
                            ${returnSegmentPrice} per seat
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* One-Way: Original layout */
                      <div>
                        {pickupStation && dropoffStation ? (
                          <div className="space-y-2 text-sm text-green-700">
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <p className="font-medium">
                                  Pickup: {pickupStation?.stationName}
                                </p>
                                <p className="text-xs opacity-80">
                                  {pickupStation?.stationAddress}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <p className="font-medium">
                                  Dropoff: {dropoffStation?.stationName}
                                </p>
                                <p className="text-xs opacity-80">
                                  {dropoffStation?.stationAddress}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-green-700">
                            <p>
                              Your journey: {searchFromCity} → {searchToCity}
                            </p>
                            <p className="text-xs opacity-80">
                              Loading station details...
                            </p>
                          </div>
                        )}
                        <p className="text-lg font-bold text-green-800 mt-3">
                          ${segmentPrice} per seat
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1: Seat Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Select Your Seats
                      </h3>
                      <p className="text-muted-foreground">
                        {isRoundTrip
                          ? `Choose your seats for both outbound and return journeys`
                          : `Choose your preferred seats for this journey`}
                      </p>
                      {/* Passenger Limit Indicator */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-center gap-2 text-blue-800">
                          <Users className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Passenger Limit: {requestedPassengers}{" "}
                            {requestedPassengers === 1 ? "seat" : "seats"}
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          You can select up to {requestedPassengers} seat
                          {requestedPassengers > 1 ? "s" : ""} for your journey
                        </p>
                      </div>
                    </div>

                    {isRoundTrip ? (
                      /* Round Trip: Sequential "Accordion" Layout */
                      <div className="space-y-8">
                        {/* Outbound Trip */}
                        <div className="p-6 rounded-lg border bg-white shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-lg text-blue-900">
                              Outbound: {searchFromCity} → {searchToCity}
                            </h4>
                            {formData.selectedSeats.length ===
                              requestedPassengers && (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">
                                  Completed ({requestedPassengers}/
                                  {requestedPassengers})
                                </span>
                              </div>
                            )}
                          </div>
                          <SeatSelectionGrid
                            seatMap={trip.vehicleInfo?.seatMap as SeatMap}
                            selectedSeats={formData.selectedSeats}
                            onSeatSelect={(seatId) =>
                              handleSeatSelect(seatId, "outbound")
                            }
                            occupiedSeats={trip.bookedSeats || []}
                          />
                        </div>

                        {/* Return Trip - Appears after outbound seats are fully selected */}
                        {formData.selectedSeats.length ===
                          requestedPassengers && (
                          <div className="p-6 rounded-lg border bg-white shadow-sm animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-semibold text-lg text-green-900">
                                Return: {searchToCity} → {searchFromCity}
                              </h4>
                              {formData.returnTrip &&
                                formData.returnTrip.selectedSeats.length ===
                                  requestedPassengers && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-medium">
                                      Completed ({requestedPassengers}/
                                      {requestedPassengers})
                                    </span>
                                  </div>
                                )}
                            </div>
                            <SeatSelectionGrid
                              seatMap={
                                returnTrip?.vehicleInfo?.seatMap as SeatMap
                              }
                              selectedSeats={
                                formData.returnTrip?.selectedSeats || []
                              }
                              onSeatSelect={(seatId) =>
                                handleSeatSelect(seatId, "return")
                              }
                              occupiedSeats={returnTrip?.bookedSeats || []}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      /* One-Way: Existing seat selection UI */
                      <div className="p-6 rounded-lg border bg-white shadow-sm">
                        <SeatSelectionGrid
                          seatMap={trip.vehicleInfo?.seatMap as SeatMap}
                          selectedSeats={formData.selectedSeats}
                          onSeatSelect={(seatId) =>
                            handleSeatSelect(seatId, "outbound")
                          }
                          occupiedSeats={trip.bookedSeats || []}
                        />
                      </div>
                    )}

                    {/* Seat selection summary */}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center font-medium text-gray-800">
                        <span>
                          Outbound Seats: {formData.selectedSeats.length}/
                          {requestedPassengers}
                          {isRoundTrip &&
                            `, Return Seats: ${formData.returnTrip?.selectedSeats.length || 0}/${requestedPassengers}`}
                        </span>
                        <span>
                          Total Selected:{" "}
                          {formData.selectedSeats.length +
                            (formData.returnTrip?.selectedSeats.length || 0)}
                          /
                          {isRoundTrip
                            ? requestedPassengers * 2
                            : requestedPassengers}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {canProceedFromStep1
                          ? "You may now proceed to the next step."
                          : isRoundTrip
                            ? `Please select ${requestedPassengers} seat${requestedPassengers > 1 ? "s" : ""} for both outbound and return journeys to continue.`
                            : `Please select ${requestedPassengers} seat${requestedPassengers > 1 ? "s" : ""} for your journey to continue.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Luggage Options */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Luggage Information
                      </h3>
                      <p className="text-muted-foreground">
                        {isRoundTrip
                          ? "Manage luggage for both your outbound and return journeys"
                          : "Select additional bags to bring on your trip"}
                      </p>
                    </div>

                    {/* Pricing Summary */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          Pricing Summary
                        </span>
                      </div>
                      <div className="text-sm text-blue-800">
                        {isRoundTrip ? (
                          <div className="space-y-1">
                            <p>
                              Outbound: {formData.selectedSeats.length} × $
                              {segmentPrice} = $
                              {segmentPrice * formData.selectedSeats.length}
                            </p>
                            <p>
                              Return:{" "}
                              {formData.returnTrip?.selectedSeats.length || 0} ×
                              ${returnSegmentPrice} = $
                              {returnSegmentPrice *
                                (formData.returnTrip?.selectedSeats.length ||
                                  0)}
                            </p>
                            <div className="border-t pt-1 mt-2">
                              <p className="font-medium">
                                Total Base Fare: $
                                {segmentPrice * formData.selectedSeats.length +
                                  returnSegmentPrice *
                                    (formData.returnTrip?.selectedSeats
                                      .length || 0)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p>Base fare: ${segmentPrice} per passenger</p>
                            <p>
                              Selected seats: {formData.selectedSeats.length} ×
                              ${segmentPrice} = $
                              {segmentPrice * formData.selectedSeats.length}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {isRoundTrip ? (
                      <div className="flex flex-col w-full items-center space-y-6">
                        <LuggageSelector
                          policy={trip.luggagePolicy}
                          selectedSeats={formData.selectedSeats.length}
                          numberOfBags={formData.numberOfBags}
                          onBagsChange={(newCount) =>
                            updateFormData({ numberOfBags: newCount })
                          }
                          tripTitle="Outbound"
                          titleColor="text-blue-900"
                        />
                        <LuggageSelector
                          policy={returnTrip?.luggagePolicy}
                          selectedSeats={
                            formData.returnTrip?.selectedSeats.length || 0
                          }
                          numberOfBags={formData.returnTrip?.numberOfBags || 1}
                          onBagsChange={(newCount) =>
                            updateFormData({
                              returnTrip: {
                                ...formData.returnTrip!,
                                numberOfBags: newCount,
                              },
                            })
                          }
                          tripTitle="Return"
                          titleColor="text-green-900"
                        />
                      </div>
                    ) : (
                      <LuggageSelector
                        policy={trip.luggagePolicy}
                        selectedSeats={formData.selectedSeats.length}
                        numberOfBags={formData.numberOfBags}
                        onBagsChange={(newCount) =>
                          updateFormData({ numberOfBags: newCount })
                        }
                        tripTitle="Your Trip"
                      />
                    )}
                  </div>
                )}

                {/* Step 3: Review & Book */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Passenger Information
                      </h3>
                      <p className="text-muted-foreground">
                        Please confirm your details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Full Name
                        </Label>
                        <Input
                          value={formData.passengerInfo.fullName}
                          onChange={(e) =>
                            updateFormData({
                              passengerInfo: {
                                ...formData.passengerInfo,
                                fullName: e.target.value,
                              },
                            })
                          }
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Email
                        </Label>
                        <Input
                          type="email"
                          value={formData.passengerInfo.email}
                          onChange={(e) =>
                            updateFormData({
                              passengerInfo: {
                                ...formData.passengerInfo,
                                email: e.target.value,
                              },
                            })
                          }
                          placeholder="Enter your email"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium mb-2 block">
                          Phone Number
                        </Label>
                        <Input
                          type="tel"
                          value={formData.passengerInfo.phone}
                          onChange={(e) =>
                            updateFormData({
                              passengerInfo: {
                                ...formData.passengerInfo,
                                phone: e.target.value,
                              },
                            })
                          }
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>

                    {/* Booking Summary */}
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-4">Booking Summary</h4>
                      <div className="space-y-3 text-sm">
                        {isRoundTrip ? (
                          <div className="space-y-4">
                            {/* Outbound Trip Summary */}
                            <div className="p-3 bg-blue-50 rounded border border-blue-200">
                              <h5 className="font-medium text-blue-900 mb-2">
                                Outbound: {searchFromCity} → {searchToCity}
                              </h5>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span>Price per seat</span>
                                  <span>${segmentPrice}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>
                                    Seats ({formData.selectedSeats.length})
                                  </span>
                                  <span>
                                    $
                                    {segmentPrice *
                                      formData.selectedSeats.length}
                                  </span>
                                </div>
                                {luggageFee > 0 && (
                                  <div className="flex justify-between">
                                    <span>Additional luggage</span>
                                    <span>${luggageFee.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-medium border-t pt-1">
                                  <span>Outbound Subtotal</span>
                                  <span>
                                    $
                                    {segmentPrice *
                                      formData.selectedSeats.length +
                                      luggageFee}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Return Trip Summary */}
                            <div className="p-3 bg-green-50 rounded border border-green-200">
                              <h5 className="font-medium text-green-900 mb-2">
                                Return: {searchToCity} → {searchFromCity}
                              </h5>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span>Price per seat</span>
                                  <span>${returnSegmentPrice}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>
                                    Seats (
                                    {formData.returnTrip?.selectedSeats
                                      .length || 0}
                                    )
                                  </span>
                                  <span>
                                    $
                                    {returnSegmentPrice *
                                      (formData.returnTrip?.selectedSeats
                                        .length || 0)}
                                  </span>
                                </div>
                                {returnLuggageFee > 0 && (
                                  <div className="flex justify-between">
                                    <span>Additional luggage</span>
                                    <span>${returnLuggageFee.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-medium border-t pt-1">
                                  <span>Return Subtotal</span>
                                  <span>
                                    $
                                    {returnSegmentPrice *
                                      (formData.returnTrip?.selectedSeats
                                        .length || 0) +
                                      returnLuggageFee}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* One-Way Trip Summary (existing logic) */
                          <div>
                            <div className="flex justify-between">
                              <span>Price per seat</span>
                              <span>${segmentPrice}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>
                                Seats selected ({formData.selectedSeats.length})
                              </span>
                              <span>
                                ${segmentPrice * formData.selectedSeats.length}
                              </span>
                            </div>
                            {luggageFee > 0 && (
                              <div className="flex justify-between">
                                <span>
                                  Additional Luggage (
                                  {formData.numberOfBags -
                                    formData.selectedSeats.length}{" "}
                                  additional bag
                                  {formData.numberOfBags -
                                    formData.selectedSeats.length >
                                  1
                                    ? "s"
                                    : ""}
                                  )
                                </span>
                                <span>${luggageFee.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="border-t pt-3">
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total Amount</span>
                            <span className="text-brand-orange">
                              ${totalPrice}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentStep(Math.max(1, currentStep - 1) as 1 | 2 | 3)
                    }
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  {currentStep < 3 ? (
                    <Button
                      onClick={() =>
                        setCurrentStep(
                          Math.min(3, currentStep + 1) as 1 | 2 | 3,
                        )
                      }
                      disabled={
                        (currentStep === 1 && !canProceedFromStep1) ||
                        (currentStep === 2 && !canProceedFromStep2) ||
                        (currentStep === 3 && !canSubmit)
                      }
                      className="bg-brand-orange text-white hover:bg-brand-orange/90"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={!canSubmit || isCreatingPayment}
                      className="bg-brand-orange text-white hover:bg-brand-orange/90"
                    >
                      {isCreatingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trip Details Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-brand-orange" />
                  Trip Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Route Info */}
                <div>
                  <p className="text-sm text-muted-foreground">Route</p>
                  <p className="font-medium">
                    {trip.routeTemplateName || "Route Template"}
                  </p>
                </div>

                {/* Time Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Departure</p>
                    <p className="font-medium text-sm">
                      {format(departureTime, "MMM dd")}
                    </p>
                    <p className="text-sm">{format(departureTime, "HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Arrival</p>
                    <p className="font-medium text-sm">
                      {format(arrivalTime, "MMM dd")}
                    </p>
                    <p className="text-sm">{format(arrivalTime, "HH:mm")}</p>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white">
                      <Star className="w-4 h-4 text-brand-orange fill-current" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{trip.driverName}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {trip.driverRating.toFixed(1)} rating
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                {trip.vehicleInfo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle</p>
                    <p className="font-medium">
                      {trip.vehicleInfo.make} {trip.vehicleInfo.model} (
                      {trip.vehicleInfo.year})
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {trip.availableSeats} of {trip.totalSeats} seats
                        available
                      </span>
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                {totalPrice > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-bold text-brand-orange">
                        ${totalPrice}
                      </span>
                    </div>
                    {isRoundTrip ? (
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>
                          Outbound: {formData.selectedSeats.length} seat
                          {formData.selectedSeats.length !== 1 ? "s" : ""} × $
                          {segmentPrice}
                        </p>
                        <p>
                          Return:{" "}
                          {formData.returnTrip?.selectedSeats.length || 0} seat
                          {(formData.returnTrip?.selectedSeats.length || 0) !==
                          1
                            ? "s"
                            : ""}{" "}
                          × ${returnSegmentPrice}
                        </p>
                      </div>
                    ) : (
                      formData.selectedSeats.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ${segmentPrice} per seat ×{" "}
                          {formData.selectedSeats.length} passenger
                          {formData.selectedSeats.length > 1 ? "s" : ""}
                        </p>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
