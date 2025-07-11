import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, MapPin, Car, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGetEligibleReturnTrips,
  useLinkReturnTrip,
} from "@/services/convex/trips";
import type { Id } from "../../../convex/_generated/dataModel";

interface LinkReturnTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outboundTrip: {
    id: string;
    routeTemplateName: string;
    departureTime: number;
    arrivalTime: number;
    routeCities: Array<{ cityName: string }>;
  };
  onLinkSuccess?: () => void;
}

export const LinkReturnTripModal: React.FC<LinkReturnTripModalProps> = ({
  open,
  onOpenChange,
  outboundTrip,
  onLinkSuccess,
}) => {
  const [selectedReturnTripId, setSelectedReturnTripId] = useState<
    string | null
  >(null);
  const [discountType, setDiscountType] = useState<"none" | "percentage">(
    "percentage",
  );
  const [discountPercentage, setDiscountPercentage] = useState<string>("10");

  // Fetch eligible return trips
  const eligibleTrips = useGetEligibleReturnTrips(outboundTrip.id);
  const linkReturnTripMutation = useLinkReturnTrip();

  const handleLinkTrips = async () => {
    if (!selectedReturnTripId) {
      toast.error("Please select a return trip");
      return;
    }

    try {
      const discount =
        discountType === "percentage"
          ? parseFloat(discountPercentage) / 100
          : undefined;

      await linkReturnTripMutation({
        outboundTripId: outboundTrip.id as Id<"trips">,
        returnTripId: selectedReturnTripId as Id<"trips">,
        roundTripDiscount: discount,
      });

      toast.success("Trips successfully linked as round trip");
      onLinkSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(`Failed to link trips: ${(error as Error).message}`);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Link Return Trip
          </DialogTitle>
          <DialogDescription>
            Select a return trip to create a round trip option for passengers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Outbound Trip Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-sm text-gray-700 mb-2">
              Outbound Trip
            </h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{outboundTrip.routeTemplateName}</p>
              <p className="text-gray-600">
                {formatDate(outboundTrip.departureTime)} at{" "}
                {formatTime(outboundTrip.departureTime)}
              </p>
              <p className="text-gray-600">
                {outboundTrip.routeCities.map((c) => c.cityName).join(" → ")}
              </p>
            </div>
          </div>

          {/* Eligible Return Trips */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Select Return Trip
            </Label>

            {eligibleTrips === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : eligibleTrips && eligibleTrips.length > 0 ? (
              <div className="space-y-3">
                {eligibleTrips.map((trip) => {
                  const isSelected = selectedReturnTripId === trip.id;
                  const departureDate = new Date(trip.departureTime);

                  return (
                    <Card
                      key={trip.id}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-brand-orange bg-orange-50"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => setSelectedReturnTripId(trip.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                {trip.routeTemplateName}
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                Scheduled
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {departureDate.toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {formatTime(
                                    new Date(trip.departureTime).getTime(),
                                  )}{" "}
                                  -{" "}
                                  {trip.arrivalTime
                                    ? formatTime(
                                        new Date(trip.arrivalTime).getTime(),
                                      )
                                    : "N/A"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">
                                {trip.routeCities.join(" → ")}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Car className="w-4 h-4" />
                                <span>{trip.vehicleInfo}</span>
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="ml-4">
                              <div className="w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No eligible return trips found</p>
                <p className="text-sm mt-2">
                  Return trips must have the opposite route and depart after the
                  outbound trip arrives
                </p>
              </div>
            )}
          </div>

          {/* Discount Settings */}
          {selectedReturnTripId && (
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-medium">
                Round Trip Discount (Optional)
              </Label>

              <div className="space-y-3">
                <Select
                  value={discountType}
                  onValueChange={(value: "none" | "percentage") =>
                    setDiscountType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No discount</SelectItem>
                    <SelectItem value="percentage">
                      Percentage discount
                    </SelectItem>
                  </SelectContent>
                </Select>

                {discountType === "percentage" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">
                      % off total price
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600">
                {discountType === "percentage" && discountPercentage
                  ? `Passengers booking both trips will receive a ${discountPercentage}% discount on the total fare`
                  : "Passengers can book both trips together without additional discount"}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkTrips}
              disabled={!selectedReturnTripId}
              className="bg-brand-orange hover:bg-brand-orange-600"
            >
              Link Trips
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
