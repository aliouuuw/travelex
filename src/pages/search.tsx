import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Clock,
  Users,
  Star,
  Car,
  Route,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import {
  useSearchTrips,
  applyTripFilters,
  sortTripResults,
  formatTripDuration,
  getRoutePathString,
  type TripSearchQueryWithCountry as BaseTripSearchQueryWithCountry,
  type TripSearchResult,
  useSearchTripsWithRoundTrip,
} from "@/services/convex/tripSearch";
import TravelExBookingFlow from "@/components/TravelExBookingFlow";
import { Badge } from "@/components/ui/badge";

// Extend the base interface to include station parameters
interface TripSearchQueryWithCountry extends BaseTripSearchQueryWithCountry {
  fromStation?: string;
  toStation?: string;
  returnDate?: string;
  tripType?: "one-way" | "round-trip";
}

// Trip Search functionality is now handled by TravelExBookingFlow component

// Trip Results Card Component
export const TripResultCard = ({
  trip,
  searchFromCity,
  searchToCity,
  searchFromStation,
  searchToStation,
  searchPassengers,
}: {
  trip: TripSearchResult;
  searchFromCity?: string;
  searchToCity?: string;
  searchFromStation?: string;
  searchToStation?: string;
  searchPassengers?: number;
}) => {
  const departureTime = new Date(trip.departureTime);
  const arrivalTime = new Date(trip.arrivalTime || trip.departureTime);
  const duration = formatTripDuration(trip.departureTime, trip.arrivalTime);
  const routePath = getRoutePathString(trip.routeCities);
  const isRoundTrip = trip.isRoundTrip && trip.returnTripDetails;

  // Build booking URL with station parameters
  const buildBookingUrl = () => {
    const baseUrl = `/book/${trip.tripId}`;
    const params = new URLSearchParams();

    if (searchFromCity) params.append("fromCity", searchFromCity);
    if (searchToCity) params.append("toCity", searchToCity);
    if (searchFromStation) params.append("fromStation", searchFromStation);
    if (searchToStation) params.append("toStation", searchToStation);
    if (searchPassengers) params.append("passengers", searchPassengers.toString());

    // NEW: Add returnTripId for round trips
    if (isRoundTrip && trip.returnTripDetails) {
      params.append("returnTripId", trip.returnTripDetails.tripId);
    }

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  return (
    <Card className="premium-card bg-white hover:shadow-premium-hover transition-all">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Route and Time Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {trip.routeTemplateName}
              </span>
              {isRoundTrip && (
                <Badge
                  variant="secondary"
                  className="bg-brand-orange/10 text-brand-orange"
                >
                  Round Trip
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MapPin className="w-5 h-5 text-brand-orange" />
              <span>{routePath}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {departureTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -
                    {arrivalTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">{duration}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>
                  {trip.availableSeats} of {trip.totalSeats} seats available
                </span>
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

            {/* Driver Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
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

          {/* Pricing and Book Button */}
          <div className="flex flex-col items-end gap-4 lg:min-w-[200px]">
            <div className="text-right">
              {isRoundTrip ? (
                <>
                  <div className="text-2xl font-bold text-brand-orange">
                    ${trip.totalPrice}
                  </div>
                  <div className="text-xs text-muted-foreground">round trip per passenger</div>
                  {(trip.discountAmount ?? 0) > 0 && (
                    <div className="text-xs text-green-600">
                      -${trip.discountAmount} discount
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-brand-orange">
                    ${trip.segmentPrice}
                  </div>
                  <div className="text-xs text-muted-foreground">per passenger</div>
                  {trip.fullRoutePrice !== trip.segmentPrice && (
                    <div className="text-xs text-muted-foreground">
                      Full route: ${trip.fullRoutePrice}
                    </div>
                  )}
                </>
              )}
            </div>

            <Button
              asChild
              className="bg-brand-orange text-white hover:bg-brand-orange/90 w-full lg:w-auto"
            >
              <Link to={buildBookingUrl()}>
                Book Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Round Trip Return Details */}
        {isRoundTrip && trip.returnTripDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="w-4 h-4 text-brand-orange" />
              <span className="text-sm font-medium text-muted-foreground">
                Return Trip: {trip.returnTripDetails.routeTemplateName}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Departure</p>
                <p className="font-medium">
                  {new Date(
                    trip.returnTripDetails.departureTime,
                  ).toLocaleDateString()}{" "}
                  at{" "}
                  {new Date(
                    trip.returnTripDetails.departureTime,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Available Seats</p>
                <p className="font-medium">
                  {trip.returnTripDetails.availableSeats} seats
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Search Page Component
export default function SearchPage() {
  const [searchQuery, setSearchQuery] =
    useState<TripSearchQueryWithCountry | null>(null);
  const [sortBy, setSortBy] = useState<
    "price" | "departure" | "duration" | "rating"
  >("departure");
  const [isSearchFormExpanded, setIsSearchFormExpanded] = useState(true);
  const [searchParams] = useSearchParams();

  // Extract initial values from URL parameters
  const fromCity = searchParams.get("fromCity");
  const toCity = searchParams.get("toCity");
  const fromStation = searchParams.get("fromStation");
  const toStation = searchParams.get("toStation");
  const departureDateStr = searchParams.get("departureDate");
  const returnDateStr = searchParams.get("returnDate");
  const tripTypeStr = searchParams.get("tripType");
  const passengersStr = searchParams.get("passengers");

  // Use Convex hook for trip search
  // Use appropriate search hook based on trip type
  const oneWayResults = useSearchTrips(
    searchQuery?.tripType === "one-way" ? searchQuery?.fromCity || "" : "",
    searchQuery?.tripType === "one-way" ? searchQuery?.toCity || "" : "",
    searchQuery?.departureDate,
    searchQuery?.minSeats,
    searchQuery?.maxPrice,
  );

  const roundTripResults = useSearchTripsWithRoundTrip(
    searchQuery?.tripType === "round-trip" ? searchQuery?.fromCity || "" : "",
    searchQuery?.tripType === "round-trip" ? searchQuery?.toCity || "" : "",
    searchQuery?.departureDate,
    searchQuery?.returnDate,
    searchQuery?.minSeats,
    searchQuery?.tripType || "one-way",
  );

  const tripResults =
    searchQuery?.tripType === "round-trip" ? roundTripResults : oneWayResults;

  // Normalize round-trip results to match TripSearchResult interface
  const normalizedResults = tripResults?.map((result) => {
    // If it's a round-trip result with totalPrice, map it to fullRoutePrice
    if ("totalPrice" in result && !("fullRoutePrice" in result)) {
      return {
        ...result,
        fullRoutePrice: result.totalPrice,
      };
    }
    return result;
  }) as TripSearchResult[] | undefined;

  // Improved loading state logic
  const isLoading = searchQuery !== null && tripResults === undefined;
  const hasResults = tripResults && tripResults.length > 0;
  const hasNoResults =
    searchQuery !== null &&
    tripResults !== undefined &&
    tripResults.length === 0;

  const initialValues =
    fromCity && toCity
      ? {
          fromCity,
          toCity,
          fromStation: fromStation || "",
          toStation: toStation || "",
          departureDate: departureDateStr
            ? new Date(departureDateStr)
            : undefined,
          returnDate: returnDateStr
            ? new Date(returnDateStr)
            : undefined,
          tripType: (tripTypeStr as "one-way" | "round-trip") || "one-way",
          passengers: passengersStr ? parseInt(passengersStr) : 1,
        }
      : undefined;

  // Handle search from URL parameters (when redirected from home page) - only run once
  useEffect(() => {
    if (fromCity && toCity) {
      const query: TripSearchQueryWithCountry = {
        fromCountry: "CA",
        toCountry: "CA",
        fromCity,
        toCity,
        fromStation: fromStation || undefined,
        toStation: toStation || undefined,
        departureDate: departureDateStr || undefined,
        returnDate: returnDateStr || undefined,
        tripType: (tripTypeStr as "one-way" | "round-trip") || "one-way",
        minSeats: passengersStr ? parseInt(passengersStr) : 1,
      };
      handleSearch(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  const handleSearch = (query: TripSearchQueryWithCountry) => {
    setSearchQuery(query);
    // Auto-collapse search form when search is initiated
    setIsSearchFormExpanded(false);
  };

  // Handle search from TravelExBookingFlow component
  const handleSearchFromFlow = (searchData: {
    fromCity: string;
    toCity: string;
    fromStation?: string;
    toStation?: string;
    departureDate: Date | undefined;
    returnDate?: Date | undefined;
    passengers: number;
    fromCountry: string;
    toCountry: string;
    tripType?: "one-way" | "round-trip";
  }) => {
    const query: TripSearchQueryWithCountry = {
      fromCountry: searchData.fromCountry,
      toCountry: searchData.toCountry,
      fromCity: searchData.fromCity,
      toCity: searchData.toCity,
      fromStation: searchData.fromStation,
      toStation: searchData.toStation,
      departureDate: searchData.departureDate
        ? format(searchData.departureDate, "yyyy-MM-dd")
        : undefined,
      returnDate: searchData.returnDate
        ? format(searchData.returnDate, "yyyy-MM-dd")
        : undefined,
      minSeats: searchData.passengers,
      tripType: searchData.tripType || "one-way",
    };
    handleSearch(query);
  };

  const filteredResults = applyTripFilters(normalizedResults || [], {});
  const sortedResults = sortTripResults(filteredResults, sortBy);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/80">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-brand-dark-blue to-brand-dark-blue/90 text-white">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-4">
              Find Your Perfect Journey
            </h1>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Search thousands of intercity trips from verified drivers. Book
              seats on segment routes or full journeys with flexible options.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-orange rounded-full"></div>
                <span>Verified Drivers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-orange rounded-full"></div>
                <span>Flexible Booking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-orange rounded-full"></div>
                <span>Secure Payments</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Search Form */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-white via-gray-50 to-white shadow-lg border-b-2 border-brand-dark-blue/20">
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200/50 backdrop-blur-sm overflow-hidden">
            {/* Header - Always Visible */}
            <div className="flex items-center justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-brand-orange to-brand-orange/80 rounded-lg flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-semibold text-lg text-gray-900">
                  {isSearchFormExpanded ? "Search Trips" : "Search Results"}
                </h2>
              </div>

              {/* Toggle Button */}
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSearchFormExpanded(!isSearchFormExpanded)}
                  className="flex items-center gap-2 border-brand-orange/30 hover:border-brand-orange hover:bg-brand-orange/5"
                >
                  <Edit className="w-4 h-4" />
                  {isSearchFormExpanded ? "Hide Search" : "Edit Search"}
                  {isSearchFormExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Collapsed Search Summary */}
            {!isSearchFormExpanded && searchQuery && (
              <div className="px-6 pb-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-orange" />
                    <span className="font-medium">
                      {searchQuery.fromCity} → {searchQuery.toCity}
                    </span>
                  </div>
                  {searchQuery.tripType === "round-trip" && (
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-brand-orange rotate-180" />
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Round Trip
                      </span>
                    </div>
                  )}
                  {searchQuery.departureDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-orange" />
                      <span>
                        Depart: {format(
                          new Date(searchQuery.departureDate),
                          "MMM dd, yyyy",
                        )}
                      </span>
                    </div>
                  )}
                  {searchQuery.returnDate && searchQuery.tripType === "round-trip" && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-orange" />
                      <span>
                        Return: {format(
                          new Date(searchQuery.returnDate),
                          "MMM dd, yyyy",
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-orange" />
                    <span>
                      {searchQuery.minSeats} passenger
                      {(searchQuery.minSeats || 1) > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Expanded Search Form */}
            {isSearchFormExpanded && (
              <div className="px-6 pb-6">
                <TravelExBookingFlow
                  onSearch={handleSearchFromFlow}
                  showTitle={false}
                  initialValues={initialValues}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 container mx-auto px-4 py-8">
        {searchQuery ? (
          <>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-brand-orange" />
                  <div className="absolute inset-0 w-12 h-12 border-2 border-brand-orange/20 rounded-full"></div>
                </div>
                <p className="mt-4 text-lg font-medium text-gray-700">
                  Searching for trips...
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Finding the best routes for your journey
                </p>
              </div>
            ) : hasResults ? (
              <div className="space-y-6">
                {/* Results Header */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {sortedResults.length}{" "}
                        {sortedResults.length === 1 ? "Trip" : "Trips"} Found
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {searchQuery.fromCity} → {searchQuery.toCity}
                        {searchQuery.departureDate && (
                          <span className="ml-2">
                            •{" "}
                            {format(
                              new Date(searchQuery.departureDate),
                              "MMM dd, yyyy",
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-600 whitespace-nowrap">
                        Sort by:
                      </Label>
                      <Select
                        value={sortBy}
                        onValueChange={(v) =>
                          setSortBy(
                            v as "price" | "departure" | "duration" | "rating",
                          )
                        }
                      >
                        <SelectTrigger className="w-[160px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="departure">
                            Departure Time
                          </SelectItem>
                          <SelectItem value="price">Price</SelectItem>
                          <SelectItem value="duration">Duration</SelectItem>
                          <SelectItem value="rating">Driver Rating</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Trip Results */}
                <div className="space-y-4">
                  {sortedResults.map((trip) => (
                    <TripResultCard
                      key={trip.tripId}
                      trip={trip}
                      searchFromCity={searchQuery?.fromCity}
                      searchToCity={searchQuery?.toCity}
                      searchFromStation={searchQuery?.fromStation}
                      searchToStation={searchQuery?.toStation}
                      searchPassengers={searchQuery?.minSeats}
                    />
                  ))}
                </div>
              </div>
            ) : hasNoResults ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No trips found
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  We couldn't find any trips matching your search criteria. Try
                  adjusting your dates or destinations.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery(null)}
                    className="text-sm"
                  >
                    Clear Search
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-orange/10 to-brand-dark-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-brand-orange" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to start your journey?
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Use the search form above to find available trips between your
              preferred cities and dates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
