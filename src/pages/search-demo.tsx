import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search, 
  CalendarIcon,
  Loader2,
  ArrowLeftRight
} from "lucide-react";
import { format } from "date-fns";
import { CountryCitySelector } from "@/components/shared/country-city-selector";
import { 
  searchTripsBySegmentWithCountry,
  type TripSearchQueryWithCountry,
  type TripSearchResult,
} from "@/services/supabase/trip-search";
import { toast } from "sonner";

// Enhanced Trip Search Form Component with Country Support
export const EnhancedTripSearchForm = ({ 
  onSearch, 
  isLoading 
}: { 
  onSearch: (query: TripSearchQueryWithCountry) => void;
  isLoading: boolean;
}) => {
  const [fromCountry, setFromCountry] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCountry, setToCountry] = useState("");
  const [toCity, setToCity] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [passengers, setPassengers] = useState("1");

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
      fromCountry,
      toCountry,
      fromCity,
      toCity,
      departureDate: departureDate ? format(departureDate, 'yyyy-MM-dd') : undefined,
      minSeats: parseInt(passengers),
    });
  };

  const handleSwapLocations = () => {
    // Swap countries and cities
    const tempCountry = fromCountry;
    const tempCity = fromCity;
    setFromCountry(toCountry);
    setFromCity(toCity);
    setToCountry(tempCountry);
    setToCity(tempCity);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Location Selection Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
            {/* From Location */}
            <div>
              <CountryCitySelector
                selectedCountry={fromCountry}
                selectedCity={fromCity}
                onSelection={(country, city) => {
                  setFromCountry(country);
                  setFromCity(city);
                }}
                label="From"
                placeholder="Departure location"
              />
            </div>

            {/* Swap Button */}
            <div className="lg:absolute lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:z-10 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSwapLocations}
                className="w-10 h-10 rounded-full border-2 border-brand-orange/40 hover:border-brand-orange hover:bg-brand-orange/10 transition-all duration-200"
                disabled={isLoading || (!fromCity && !toCity)}
              >
                <ArrowLeftRight className="w-4 h-4 text-brand-orange" />
              </Button>
            </div>

            {/* To Location */}
            <div>
              <CountryCitySelector
                selectedCountry={toCountry}
                selectedCity={toCity}
                onSelection={(country, city) => {
                  setToCountry(country);
                  setToCity(city);
                }}
                label="To"
                placeholder="Destination"
              />
            </div>
          </div>

          {/* Travel Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Departure Date */}
            <div>
              <Label className="text-sm font-medium text-gray-600 mb-1 block">Departure Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-10"
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departureDate ? format(departureDate, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
              <Label className="text-sm font-medium text-gray-600 mb-1 block">Passengers</Label>
              <Select value={passengers} onValueChange={setPassengers} disabled={isLoading}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'passenger' : 'passengers'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full bg-brand-orange hover:bg-brand-orange-600 text-white h-10"
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
          </div>
        </div>
      </form>
    </div>
  );
};

// Demo Search Results Component
export const SearchResultsDemo = ({ 
  results, 
  query 
}: { 
  results: TripSearchResult[]; 
  query: TripSearchQueryWithCountry | null;
}) => {
  if (!query) {
    return (
      <div className="text-center py-12">
        <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Search</h3>
        <p className="text-gray-600">
          Select your departure and destination to find available trips between Senegal and Canada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {results.length} {results.length === 1 ? 'Trip' : 'Trips'} Found
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {query.fromCity} → {query.toCity}
          {query.departureDate && (
            <span className="ml-2">
              • {format(new Date(query.departureDate), "MMM dd, yyyy")}
            </span>
          )}
        </p>
      </div>

      {/* Results List */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Trips Found</h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or check back later for new trips.
            </p>
          </CardContent>
        </Card>
      ) : (
        results.map((trip) => (
          <Card key={trip.tripId} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {trip.routeTemplateName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Driver: {trip.driverName} ⭐ {trip.driverRating.toFixed(1)}
                  </p>
                  
                  {/* Route Display with Countries */}
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    {trip.routeCities.map((city, index) => (
                      <React.Fragment key={city.id}>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{city.cityName}</span>
                          {city.countryCode && (
                            <span className="text-xs text-gray-500">
                              ({city.countryCode})
                            </span>
                          )}
                        </div>
                        {index < trip.routeCities.length - 1 && (
                          <span className="text-gray-400">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                    <span>🕐 {format(new Date(trip.departureTime), "MMM dd, HH:mm")}</span>
                    <span>💺 {trip.availableSeats} seats available</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand-orange">
                    ${trip.segmentPrice}
                  </div>
                  <p className="text-xs text-gray-500">per person</p>
                  <Button 
                    className="mt-3 bg-brand-orange hover:bg-brand-orange-600 text-white"
                    size="sm"
                  >
                    Book Trip
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

// Main Demo Page Component
export default function SearchDemoPage() {
  const [searchQuery, setSearchQuery] = useState<TripSearchQueryWithCountry | null>(null);
  const [searchResults, setSearchResults] = useState<TripSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (query: TripSearchQueryWithCountry) => {
    setSearchQuery(query);
    setIsLoading(true);
    
    searchTripsBySegmentWithCountry(query)
      .then((results) => {
        setSearchResults(results);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Search error:', error);
        toast.error('Failed to search trips. Please try again.');
        setIsLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Trip Search
          </h1>
          <p className="text-gray-600">
            Search for trips between Senegal 🇸🇳 and Canada 🇨🇦
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <EnhancedTripSearchForm 
            onSearch={handleSearch} 
            isLoading={isLoading} 
          />
        </div>

        {/* Search Results */}
        <SearchResultsDemo 
          results={searchResults} 
          query={searchQuery} 
        />
      </div>
    </div>
  );
} 