"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, Calendar as CalendarIcon, MapPin, Users, ArrowLeftRight, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCitiesForCountry } from "@/services/convex/countries";
import { usePublicStationsForCity } from "@/services/convex/citiesStations";

interface SearchFormData {
  fromCity: string;
  toCity: string;
  fromStation: string;
  toStation: string;
  departureDate: Date | undefined;
  passengers: number;
}

interface TravelExBookingFlowProps {
  onSearch?: (searchData: SearchFormData & { fromCountry: string; toCountry: string }) => void;
  redirectToSearch?: boolean;
  showTitle?: boolean;
  className?: string;
  initialValues?: Partial<SearchFormData>;
}

export default function TravelExBookingFlow({ 
  onSearch, 
  redirectToSearch = false, 
  showTitle = true,
  className = "",
  initialValues
}: TravelExBookingFlowProps) {
  const [searchData, setSearchData] = useState<SearchFormData>({
    fromCity: initialValues?.fromCity || "",
    toCity: initialValues?.toCity || "",
    fromStation: initialValues?.fromStation || "",
    toStation: initialValues?.toStation || "",
    departureDate: initialValues?.departureDate || undefined,
    passengers: initialValues?.passengers || 1
  });

  // Load cities for Canada
  const canadianCities = useCitiesForCountry('CA');
  const cities = canadianCities || [];
  const loading = canadianCities === undefined;

  // Get stations for selected cities using the public hook
  const fromStations = usePublicStationsForCity(searchData.fromCity);
  const toStations = usePublicStationsForCity(searchData.toCity);

  const updateSearchData = (updates: Partial<SearchFormData>) => {
    setSearchData((prev: SearchFormData) => {
      const newData = { ...prev, ...updates };
      
      // If updating origin city, clear destination if they're the same and clear selected stations
      if (updates.fromCity !== undefined) {
        newData.fromStation = "";
        if (newData.fromCity === newData.toCity) {
          newData.toCity = "";
          newData.toStation = "";
        }
      }
      
      // If updating destination city, clear origin if they're the same and clear selected stations
      if (updates.toCity !== undefined) {
        newData.toStation = "";
        if (newData.fromCity === newData.toCity) {
          newData.fromCity = "";
          newData.fromStation = "";
        }
      }
      
      return newData;
    });
  };

  const swapCities = () => {
    if (searchData.fromCity && searchData.toCity && searchData.fromCity !== searchData.toCity) {
      updateSearchData({
        fromCity: searchData.toCity,
        toCity: searchData.fromCity,
        fromStation: searchData.toStation,
        toStation: searchData.fromStation
      });
    }
  };

  const canSearch = () => {
    return searchData.fromCity && 
           searchData.toCity && 
           searchData.fromCity !== searchData.toCity &&
           searchData.fromStation &&
           searchData.toStation &&
           searchData.departureDate && 
           searchData.passengers > 0;
  };

  const handleSearch = () => {
    if (!canSearch()) {
      if (!searchData.fromCity || !searchData.toCity) {
        toast.error("Please select both departure and destination cities");
      } else if (searchData.fromCity === searchData.toCity) {
        toast.error("Departure and destination cities must be different");
      } else if (!searchData.fromStation || !searchData.toStation) {
        toast.error("Please select both pickup and dropoff stations");
      } else if (!searchData.departureDate) {
        toast.error("Please select a departure date");
      }
      return;
    }

    if (redirectToSearch) {
      const searchUrl = new URL('/search', window.location.origin);
      searchUrl.searchParams.set('fromCountry', 'CA');
      searchUrl.searchParams.set('toCountry', 'CA');
      searchUrl.searchParams.set('fromCity', searchData.fromCity);
      searchUrl.searchParams.set('toCity', searchData.toCity);
      if (searchData.fromStation) {
        searchUrl.searchParams.set('fromStation', searchData.fromStation);
      }
      if (searchData.toStation) {
        searchUrl.searchParams.set('toStation', searchData.toStation);
      }
      if (searchData.departureDate) {
        searchUrl.searchParams.set('departureDate', format(searchData.departureDate, 'yyyy-MM-dd'));
      }
      if (searchData.passengers) {
        searchUrl.searchParams.set('passengers', searchData.passengers.toString());
      }
      
      window.location.href = searchUrl.toString();
    } else {
      // Call the onSearch callback with station information
      onSearch?.({
        fromCountry: 'CA',
        toCountry: 'CA',
        fromCity: searchData.fromCity,
        toCity: searchData.toCity,
        fromStation: searchData.fromStation,
        toStation: searchData.toStation,
        departureDate: searchData.departureDate,
        passengers: searchData.passengers,
      });
    }
  };

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      {showTitle && (
        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold text-travelex-blue">
            Book Your Journey
          </CardTitle>
          <p className="text-sm sm:text-base text-gray-600">
            Select your route, choose your travel date, and get ready for premium travel
          </p>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        {/* City Selection */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="flex-1 w-full space-y-2">
              <label className="text-sm font-medium text-gray-700">From</label>
              <Select
                value={searchData.fromCity}
                onValueChange={(value) => updateSearchData({ fromCity: value })}
                disabled={loading}
              >
                <SelectTrigger className="h-12 w-full">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-travelex-orange" />
                    <SelectValue placeholder={loading ? "Loading cities..." : "Select departure city"} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      Loading cities...
                    </div>
                  ) : cities.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      No cities available
                    </div>
                  ) : (
                    <>
                      {cities.map(city => (
                        <SelectItem key={city.cityName} value={city.cityName}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{city.cityName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={swapCities}
              className="mt-0 lg:mt-6 border-travelex-orange text-travelex-orange hover:bg-travelex-orange hover:text-white flex-shrink-0"
              disabled={loading || !searchData.fromCity || !searchData.toCity || searchData.fromCity === searchData.toCity}
              title={
                loading 
                  ? "Loading cities..."
                  : !searchData.fromCity || !searchData.toCity 
                  ? "Select both departure and destination cities to swap"
                  : searchData.fromCity === searchData.toCity
                  ? "Cannot swap identical cities"
                  : "Swap departure and destination cities"
              }
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <div className="flex-1 w-full space-y-2">
              <label className="text-sm font-medium text-gray-700">To</label>
              <Select
                value={searchData.toCity}
                onValueChange={(value) => updateSearchData({ toCity: value })}
                disabled={loading}
              >
                <SelectTrigger className="h-12 w-full">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-travelex-orange" />
                    <SelectValue placeholder={loading ? "Loading cities..." : "Select destination city"} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      Loading cities...
                    </div>
                  ) : cities.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      No cities available
                    </div>
                  ) : (
                    <>
                      {cities.map(city => (
                        <SelectItem key={city.cityName} value={city.cityName}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{city.cityName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Station Selection - Only show when cities are selected */}
          {(searchData.fromCity || searchData.toCity) && (
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Pickup Station {searchData.fromCity && `(${searchData.fromCity})`}
                </label>
                <Select
                  value={searchData.fromStation}
                  onValueChange={(value) => updateSearchData({ fromStation: value })}
                  disabled={loading || !searchData.fromCity}
                >
                  <SelectTrigger className="h-12 w-full">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-travelex-orange" />
                      <SelectValue placeholder={
                        !searchData.fromCity 
                          ? "Select departure city first"
                          : loading 
                          ? "Loading stations..."
                          : fromStations === undefined 
                          ? "Loading stations..."
                          : fromStations.length === 0
                          ? "No stations available"
                          : "Select pickup station"
                      } />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {fromStations && fromStations.length > 0 && (
                      <>
                        {fromStations.map(station => (
                          <SelectItem key={station.id} value={station.id || station.name}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{station.name}</span>
                              <span className="text-xs text-muted-foreground">{station.address}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-0 lg:mt-6 flex-shrink-0">
                <div className="w-10 h-10 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Dropoff Station {searchData.toCity && `(${searchData.toCity})`}
                </label>
                <Select
                  value={searchData.toStation}
                  onValueChange={(value) => updateSearchData({ toStation: value })}
                  disabled={loading || !searchData.toCity}
                >
                  <SelectTrigger className="h-12 w-full">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-travelex-orange" />
                      <SelectValue placeholder={
                        !searchData.toCity 
                          ? "Select destination city first"
                          : loading 
                          ? "Loading stations..."
                          : toStations === undefined 
                          ? "Loading stations..."
                          : toStations.length === 0
                          ? "No stations available"
                          : "Select dropoff station"
                      } />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {toStations && toStations.length > 0 && (
                      <>
                        {toStations.map(station => (
                          <SelectItem key={station.id} value={station.id || station.name}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{station.name}</span>
                              <span className="text-xs text-muted-foreground">{station.address}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Date and Passengers Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Departure Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    !searchData.departureDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-travelex-orange" />
                  <span className="truncate">
                    {searchData.departureDate ? format(searchData.departureDate, "PPP") : "Select date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border shadow-lg z-50" align="start">
                <Calendar
                  mode="single"
                  selected={searchData.departureDate}
                  onSelect={(date) => updateSearchData({ departureDate: date })}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Passengers</label>
            <Select
              value={searchData.passengers.toString()}
              onValueChange={(value) => updateSearchData({ passengers: parseInt(value) })}
            >
              <SelectTrigger className="h-12 w-full">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-travelex-orange" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? "Passenger" : "Passengers"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Station Selection Info */}
        {(searchData.fromCity || searchData.toCity) && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Station Selection</span>
            </div>
            <p className="text-xs text-blue-700">
              Station selection is required. Please select both pickup and dropoff stations.
            </p>
          </div>
        )}

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={!canSearch() || loading}
          className="w-full h-12 bg-travelex-orange hover:bg-travelex-orange/90 text-white font-semibold text-sm sm:text-base"
        >
          <>
            Search Trips
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        </Button>

        {/* Quick Info */}
        <div className="text-center text-xs sm:text-sm text-gray-600 space-y-1">
          <p>✓ No reservation fees • ✓ Free Wi-Fi • ✓ Complimentary snacks</p>
          <p>✓ First bag included • ✓ Premium comfort seating</p>
        </div>
      </CardContent>
    </Card>
  );
} 