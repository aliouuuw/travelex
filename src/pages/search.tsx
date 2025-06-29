import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search, 
  MapPin, 
  Clock, 
  Users, 
  Star, 
  CalendarIcon,
  Car,
  Route,
  Loader2,
  ArrowRight,
  ArrowLeftRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { 
  searchTripsBySegmentWithCountry,
  applyTripFilters,
  sortTripResults,
  formatTripDuration,
  getRoutePathString,
  type TripSearchQueryWithCountry,
  type TripSearchResult,
} from "@/services/trip-search";
import { getAvailableCountries, getCitiesForCountry, type Country } from "@/services/countries";
import { toast } from "sonner";

// 2-Step Trip Search Form Component
export const TripSearchForm = ({ 
  onSearch, 
  isLoading 
}: { 
  onSearch: (query: TripSearchQueryWithCountry) => void;
  isLoading: boolean;
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [passengers, setPassengers] = useState("1");

  // Fetch available countries
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: getAvailableCountries,
  });

  // Fetch cities for selected country
  const { data: cities = [] } = useQuery({
    queryKey: ['cities', selectedCountry],
    queryFn: () => getCitiesForCountry(selectedCountry),
    enabled: !!selectedCountry,
  });

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setFromCity("");
    setToCity("");
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromCity || !toCity) {
      toast.error("Please select both departure and destination cities");
      return;
    }

    if (fromCity === toCity) {
      toast.error("Departure and destination cities must be different");
      return;
    }

    onSearch({
      fromCountry: selectedCountry,
      toCountry: selectedCountry,
      fromCity,
      toCity,
      departureDate: departureDate ? format(departureDate, 'yyyy-MM-dd') : undefined,
      minSeats: parseInt(passengers),
    });
  };

  const handleSwapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  const handleBack = () => {
    setStep(1);
    setFromCity("");
    setToCity("");
  };



  const selectedCountryInfo = countries.find(c => c.code === selectedCountry);

  return (
    <div className="bg-transparent">
      {step === 1 ? (
        // Step 1: Country Selection
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select your travel country</h3>
            <p className="text-sm text-gray-600">Choose the country you'll be traveling within</p>
          </div>
          
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {countries.map((country) => (
               <Button
                 key={country.code}
                 variant="outline"
                 onClick={() => handleCountrySelect(country.code)}
                 className="h-16 p-4 justify-start border-2 hover:border-brand-orange hover:bg-brand-orange/5 transition-all duration-200"
                 disabled={isLoading}
               >
                 <div className="flex items-center gap-3 w-full">
                   <div className="text-2xl">{country.flagEmoji}</div>
                   <div className="text-left">
                     <div className="font-medium">{country.name}</div>
                     <div className="text-xs text-gray-500">{country.cityCount} cities available</div>
                   </div>
                 </div>
               </Button>
             ))}
           </div>
        </div>
      ) : (
        // Step 2: City and Travel Details
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Country Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{selectedCountryInfo?.flagEmoji}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedCountryInfo?.name}</h3>
                  <p className="text-sm text-gray-500">Select your departure and destination cities</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isLoading}
              >
                Change Country
              </Button>
            </div>

            {/* Cities and Travel Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cities Selection */}
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2 items-end">
                  {/* From City */}
                  <div className="col-span-2">
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">From</Label>
                                         <Select value={fromCity} onValueChange={setFromCity} disabled={isLoading}>
                       <SelectTrigger className="h-9 text-sm">
                         <SelectValue placeholder="Departure" />
                       </SelectTrigger>
                       <SelectContent>
                         {cities.map((city) => (
                           <SelectItem key={city.cityName} value={city.cityName}>
                             {city.cityName}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                  </div>

                  {/* Swap Button */}
                  <div className="col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSwapCities}
                      className="w-9 h-9 rounded-full border-2 border-brand-orange/40 hover:border-brand-orange hover:bg-brand-orange/10"
                      disabled={isLoading || (!fromCity && !toCity)}
                    >
                      <ArrowLeftRight className="w-3 h-3 text-brand-orange" />
                    </Button>
                  </div>

                  {/* To City */}
                  <div className="col-span-2">
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">To</Label>
                                         <Select value={toCity} onValueChange={setToCity} disabled={isLoading}>
                       <SelectTrigger className="h-9 text-sm">
                         <SelectValue placeholder="Destination" />
                       </SelectTrigger>
                       <SelectContent>
                         {cities.map((city) => (
                           <SelectItem key={city.cityName} value={city.cityName}>
                             {city.cityName}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                  </div>
                </div>
              </div>

              {/* Travel Details */}
              <div className="grid grid-cols-2 gap-2">
                {/* Departure Date */}
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-full justify-start text-left font-normal text-sm"
                        disabled={isLoading}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3 opacity-50" />
                        <span className="truncate">
                          {departureDate ? format(departureDate, "MMM dd") : "Select"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border shadow-lg z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={departureDate}
                        onSelect={setDepartureDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Passengers */}
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Passengers</Label>
                  <Select value={passengers} onValueChange={setPassengers} disabled={isLoading}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <span className="text-sm">{num}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Search Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-brand-orange to-brand-orange/90 hover:from-brand-orange/90 hover:to-brand-orange text-white h-10 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              disabled={isLoading || !fromCity || !toCity}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Trips
                </>
              )}
            </Button>
          </div>
                 </form>
       )}
    </div>
  );
};

// Trip Results Card Component
export const TripResultCard = ({ trip }: { trip: TripSearchResult }) => {
  const departureTime = new Date(trip.departureTime);
  const arrivalTime = new Date(trip.arrivalTime);
  const duration = formatTripDuration(trip.departureTime, trip.arrivalTime);
  const routePath = getRoutePathString(trip.routeCities);

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
                    {departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                    {arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-muted-foreground">{duration}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{trip.availableSeats} of {trip.totalSeats} seats available</span>
              </div>

              {trip.vehicleInfo && (
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <span>{trip.vehicleInfo.make} {trip.vehicleInfo.model}</span>
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
              <div className="text-2xl font-bold text-brand-orange">
                ₵{trip.segmentPrice}
              </div>
              <div className="text-xs text-muted-foreground">
                per passenger
              </div>
              {trip.fullRoutePrice !== trip.segmentPrice && (
                <div className="text-xs text-muted-foreground">
                  Full route: ₵{trip.fullRoutePrice}
                </div>
              )}
            </div>

            <Button 
              asChild
              className="bg-brand-orange hover:bg-brand-orange/90 text-white w-full lg:w-auto"
            >
              <Link to={`/book/${trip.tripId}`}>
                Book Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Search Page Component
export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState<TripSearchQueryWithCountry | null>(null);
  const [searchResults, setSearchResults] = useState<TripSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'departure' | 'duration' | 'rating'>('departure');

  const handleSearch = (query: TripSearchQueryWithCountry) => {
    setSearchQuery(query);
    setIsLoading(true);
    
    searchTripsBySegmentWithCountry(query)
      .then((results) => {
        setSearchResults(results);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  const filteredResults = applyTripFilters(searchResults, {});
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
              Search thousands of intercity trips from verified drivers. Book seats on segment routes or full journeys with flexible options.
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
          <div className="bg-white rounded-xl shadow-xl border border-gray-200/50 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-orange to-brand-orange/80 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-semibold text-lg text-gray-900">Search Trips</h2>
            </div>
            <TripSearchForm 
              onSearch={handleSearch} 
              isLoading={isLoading} 
            />
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
                <p className="mt-4 text-lg font-medium text-gray-700">Searching for trips...</p>
                <p className="text-sm text-gray-500 mt-1">Finding the best routes for your journey</p>
              </div>
            ) : (
              <>
                {sortedResults.length > 0 ? (
                  <div className="space-y-6">
                    {/* Results Header */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">
                            {sortedResults.length} {sortedResults.length === 1 ? 'Trip' : 'Trips'} Found
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            {searchQuery.fromCity} → {searchQuery.toCity}
                            {searchQuery.departureDate && (
                              <span className="ml-2">
                                • {format(new Date(searchQuery.departureDate), "MMM dd, yyyy")}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</Label>
                          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'price' | 'departure' | 'duration' | 'rating')}>
                            <SelectTrigger className="w-[160px] h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="departure">Departure Time</SelectItem>
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
                        <TripResultCard key={trip.tripId} trip={trip} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips found</h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      We couldn't find any trips matching your search criteria. Try adjusting your dates or destinations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery(null);
                          setSearchResults([]);
                        }}
                        className="text-sm"
                      >
                        Clear Search
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-orange/10 to-brand-dark-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-brand-orange" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to start your journey?</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Use the search form above to find available trips between your preferred cities and dates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 