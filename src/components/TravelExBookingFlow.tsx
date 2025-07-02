"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, Calendar as CalendarIcon, MapPin, Users, ArrowLeftRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getCitiesForCountry } from "@/services/supabase/countries";

interface SearchFormData {
  fromCity: string;
  toCity: string;
  departureDate: Date | undefined;
  passengers: number;
}

interface City {
  cityName: string;
  tripCount: number;
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [searchData, setSearchData] = useState<SearchFormData>({
    fromCity: initialValues?.fromCity || "",
    toCity: initialValues?.toCity || "",
    departureDate: initialValues?.departureDate || undefined,
    passengers: initialValues?.passengers || 1
  });

  // Load Canadian cities on component mount
  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoading(true);
        const canadianCities = await getCitiesForCountry('CA');
        setCities(canadianCities);
      } catch (error) {
        console.error('Failed to load cities:', error);
        toast.error('Failed to load cities. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadCities();
  }, []);

  const updateSearchData = (updates: Partial<SearchFormData>) => {
    setSearchData((prev: SearchFormData) => {
      const newData = { ...prev, ...updates };
      
      // If updating origin city, clear destination if they're the same
      if (updates.fromCity !== undefined && newData.fromCity === newData.toCity) {
        newData.toCity = "";
      }
      
      // If updating destination city, clear origin if they're the same
      if (updates.toCity !== undefined && newData.fromCity === newData.toCity) {
        newData.fromCity = "";
      }
      
      return newData;
    });
  };

  const swapCities = () => {
    if (searchData.fromCity && searchData.toCity && searchData.fromCity !== searchData.toCity) {
      updateSearchData({
        fromCity: searchData.toCity,
        toCity: searchData.fromCity
      });
    }
  };

  const canSearch = () => {
    return searchData.fromCity && 
           searchData.toCity && 
           searchData.fromCity !== searchData.toCity && 
           searchData.departureDate && 
           searchData.passengers > 0;
  };

  const handleSearch = () => {
    if (!canSearch()) {
      if (!searchData.fromCity || !searchData.toCity) {
        toast.error("Please select both departure and destination cities");
      } else if (searchData.fromCity === searchData.toCity) {
        toast.error("Departure and destination cities must be different");
      } else if (!searchData.departureDate) {
        toast.error("Please select a departure date");
      }
      return;
    }

    const searchQuery = {
      ...searchData,
      fromCountry: 'CA',
      toCountry: 'CA',
    };

    if (redirectToSearch) {
      // Navigate to search page with query parameters
      const searchParams = new URLSearchParams({
        fromCity: searchData.fromCity,
        toCity: searchData.toCity,
        departureDate: format(searchData.departureDate!, 'yyyy-MM-dd'),
        passengers: searchData.passengers.toString()
      });
      navigate(`/search?${searchParams.toString()}`);
    } else if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
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
                    <SelectValue placeholder="Select departure city" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {cities.map(city => (
                    <SelectItem key={city.cityName} value={city.cityName}>
                      {city.cityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={swapCities}
              className="mt-0 lg:mt-6 border-travelex-orange text-travelex-orange hover:bg-travelex-orange hover:text-white flex-shrink-0"
              disabled={!searchData.fromCity || !searchData.toCity || searchData.fromCity === searchData.toCity}
              title={
                !searchData.fromCity || !searchData.toCity 
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
                    <SelectValue placeholder="Select destination city" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {cities.map(city => (
                    <SelectItem key={city.cityName} value={city.cityName}>
                      {city.cityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                  disabled={(date) => date < new Date()}
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

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={!canSearch() || loading}
          className="w-full h-12 bg-travelex-orange hover:bg-travelex-orange/90 text-white font-semibold text-sm sm:text-base"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Search Trips
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
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