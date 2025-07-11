import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Users,
  Star,
  Car,
  Route,
  ArrowRight,
  Calendar,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import type { TripSearchResult } from "@/services/convex/tripSearch";
import { formatTripDuration, getRoutePathString } from "@/services/convex/tripSearch";

interface RoundTripCardProps {
  trip: TripSearchResult;
  searchFromCity?: string;
  searchToCity?: string;
  searchFromStation?: string;
  searchToStation?: string;
}

export function RoundTripCard({
  trip,
  searchFromCity,
  searchToCity,
  searchFromStation,
  searchToStation,
}: RoundTripCardProps) {
  if (!trip.isRoundTrip || !trip.returnTripDetails) {
    return null;
  }

  const outboundDeparture = new Date(trip.departureTime);
  const outboundArrival = new Date(trip.arrivalTime || trip.departureTime);
  const outboundDuration = formatTripDuration(trip.departureTime, trip.arrivalTime);

  const returnDeparture = new Date(trip.returnTripDetails.departureTime);
  const returnArrival = new Date(trip.returnTripDetails.arrivalTime || trip.returnTripDetails.departureTime);
  const returnDuration = formatTripDuration(
    trip.returnTripDetails.departureTime,
    trip.returnTripDetails.arrivalTime
  );

  const routePath = getRoutePathString(trip.routeCities);
  const totalPrice = trip.totalPrice || (trip.segmentPrice + trip.returnTripDetails.price);
  const discountAmount = trip.discountAmount || 0;
  const discountPercentage = trip.discountPercentage || 0;

  // Build booking URL with parameters
  const buildBookingUrl = () => {
    const baseUrl = `/book/${trip.tripId}`;
    const params = new URLSearchParams();

    params.append("isRoundTrip", "true");
    params.append("returnTripId", trip.returnTripId || "");
    if (searchFromCity) params.append("fromCity", searchFromCity);
    if (searchToCity) params.append("toCity", searchToCity);
    if (searchFromStation) params.append("fromStation", searchFromStation);
    if (searchToStation) params.append("toStation", searchToStation);

    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <Card className="premium-card bg-white hover:shadow-premium-hover transition-all">
      <CardContent className="p-6 space-y-4">
        {/* Header with Route and Round Trip Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Route className="w-5 h-5 text-brand-orange" />
            <h3 className="text-lg font-semibold text-foreground">{routePath}</h3>
            <Badge variant="secondary" className="bg-brand-orange/10 text-brand-orange">
              Round Trip
            </Badge>
          </div>

          {/* Driver Rating */}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{trip.driverRating.toFixed(1)}</span>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-gradient-to-r from-brand-orange/5 to-brand-dark-blue/5 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Price</p>
              {discountAmount > 0 && (
                <p className="text-xs text-muted-foreground line-through">
                  ${(totalPrice + discountAmount).toFixed(2)}
                </p>
              )}
              <p className="text-2xl font-bold text-brand-orange">
                ${totalPrice.toFixed(2)}
              </p>
            </div>
            {discountAmount > 0 && (
              <Badge className="bg-green-100 text-green-800">
                <Tag className="w-3 h-3 mr-1" />
                Save {discountPercentage}% (${discountAmount.toFixed(2)})
              </Badge>
            )}
          </div>
        </div>

        {/* Trip Details Tabs */}
        <Tabs defaultValue="outbound" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="outbound" className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Outbound
            </TabsTrigger>
            <TabsTrigger value="return" className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" />
              Return
            </TabsTrigger>
          </TabsList>

          {/* Outbound Trip */}
          <TabsContent value="outbound" className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(outboundDeparture, "EEEE, MMMM d, yyyy")}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {outboundDeparture.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {outboundArrival.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">{outboundDuration}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{trip.availableSeats} seats available</span>
              </div>

              {trip.vehicleInfo && (
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {trip.vehicleInfo.make} {trip.vehicleInfo.model}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Route: {trip.routeTemplateName}
              </p>
              <p className="text-sm font-medium">
                Price: ${trip.segmentPrice} per passenger
              </p>
            </div>
          </TabsContent>

          {/* Return Trip */}
          <TabsContent value="return" className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(returnDeparture, "EEEE, MMMM d, yyyy")}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {returnDeparture.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {returnArrival.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">{returnDuration}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{trip.returnTripDetails.availableSeats} seats available</span>
              </div>

              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span>{trip.returnTripDetails.vehicleInfo}</span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Route: {trip.returnTripDetails.routeTemplateName}
              </p>
              <p className="text-sm font-medium">
                Price: ${trip.returnTripDetails.price} per passenger
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Pickup/Dropoff Stations */}
        {trip.pickupStations.length > 0 && trip.dropoffStations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Pickup Stations ({searchFromCity || trip.pickupStations[0].cityName})
              </p>
              <div className="space-y-1">
                {trip.pickupStations.map((station) => (
                  <p key={station.id} className="text-sm">
                    {station.stationName}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Dropoff Stations ({searchToCity || trip.dropoffStations[0].cityName})
              </p>
              <div className="space-y-1">
                {trip.dropoffStations.map((station) => (
                  <p key={station.id} className="text-sm">
                    {station.stationName}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Book Button */}
        <Button
          asChild
          className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
          size="lg"
        >
          <Link to={buildBookingUrl()}>
            Book Round Trip
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
