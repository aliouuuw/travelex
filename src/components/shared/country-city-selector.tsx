import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Globe, Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAvailableCountries, getAvailableCitiesByCountry, type Country, type CityWithCountry } from "@/services/countries";

interface CountryCitySelectorProps {
  selectedCountry?: string;
  selectedCity?: string;
  onSelection: (country: string, city: string) => void;
  label?: string;
  placeholder?: string;
}

export const CountryCitySelector = ({
  selectedCountry,
  selectedCity,
  onSelection,
  label = "Select Location",
  placeholder = "Choose country and city"
}: CountryCitySelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch countries and cities
  const { data: countries = [], isLoading: countriesLoading } = useQuery<Country[]>({
    queryKey: ['available-countries'],
    queryFn: getAvailableCountries,
  });

  const { data: allCities = [], isLoading: citiesLoading } = useQuery<CityWithCountry[]>({
    queryKey: ['available-cities-by-country'],
    queryFn: getAvailableCitiesByCountry,
  });

  // Filter cities by selected country
  const availableCities = selectedCountry 
    ? allCities.filter(city => city.countryCode === selectedCountry)
    : [];

  // Filter cities by search term
  const filteredCities = availableCities.filter(city =>
    city.cityName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCountryChange = (countryCode: string) => {
    onSelection(countryCode, ""); // Clear city when country changes
    setSearchTerm(""); // Clear search when country changes
  };

  const handleCityChange = (cityName: string) => {
    if (selectedCountry) {
      onSelection(selectedCountry, cityName);
    }
  };

  const selectedCountryData = countries.find(c => c.code === selectedCountry);
  const selectedCityData = allCities.find(c => 
    c.countryCode === selectedCountry && c.cityName === selectedCity
  );

  return (
    <div className="space-y-3">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      {/* Country Selection */}
      <div>
        <Label className="text-xs text-gray-600 mb-1 block">Country</Label>
        <Select value={selectedCountry || ""} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {countriesLoading ? (
              <div className="p-2 text-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mx-auto mb-1" />
                Loading countries...
              </div>
            ) : (
              countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{country.flagEmoji}</span>
                      <div>
                        <span className="font-medium">{country.name}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Badge variant="secondary" className="text-xs">
                        {country.cityCount} cities
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-brand-orange/10 text-brand-orange border-brand-orange/20">
                        {country.tripCount} trips
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* City Selection */}
      {selectedCountry && (
        <div>
          <Label className="text-xs text-gray-600 mb-1 block">
            City in {selectedCountryData?.name} {selectedCountryData?.flagEmoji}
          </Label>
          
          {/* Search within country */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder={`Search cities in ${selectedCountryData?.name}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 p-0 h-auto focus-visible:ring-0"
              />
            </div>
            
            {/* Cities List */}
            <div className="max-h-48 overflow-y-auto">
              {citiesLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <Clock className="w-4 h-4 mx-auto mb-2" />
                  Loading cities...
                </div>
              ) : filteredCities.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  {searchTerm ? `No cities found matching "${searchTerm}"` : "No cities available"}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {filteredCities.map((city) => (
                    <button
                      key={city.cityName}
                      type="button"
                      onClick={() => handleCityChange(city.cityName)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        selectedCity === city.cityName
                          ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{city.cityName}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {city.tripCount} trips
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedCountry && selectedCity && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-lg">{selectedCountryData?.flagEmoji}</span>
                <span className="font-medium">{selectedCountryData?.name}</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{selectedCity}</span>
              </div>
              {selectedCityData && (
                <>
                  <span className="text-gray-400">•</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedCityData.tripCount} trips available
                  </Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 