import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, 
  MapPin, 
  Clock, 
  Plus, 
  Check,
  Globe,
  AlertCircle
} from "lucide-react";
import { useAvailableCountries, useAvailableCitiesByCountry, useCreateGlobalCity } from "@/services/convex/countries";
import { CountryRequestModal } from "./country-request-modal";
import { toast } from "sonner";

interface EnhancedCitySelectorProps {
  selectedCountry?: string;
  selectedCity?: string;
  onSelection: (country: string, city: string) => void;
  label?: string;
  placeholder?: string;
}

export const EnhancedCitySelector = ({
  selectedCountry,
  selectedCity,
  onSelection,
  label = "Select Location",
}: EnhancedCitySelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCountryRequest, setShowCountryRequest] = useState(false);
  const [showNewCityDialog, setShowNewCityDialog] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [isCreatingCity, setIsCreatingCity] = useState(false);

  // Fetch countries and cities
  const countriesData = useAvailableCountries();
  const citiesData = useAvailableCitiesByCountry();
  const countries = countriesData || [];
  const allCities = citiesData || [];
  const countriesLoading = countriesData === undefined;
  const citiesLoading = citiesData === undefined;

  // Create city mutation
  const createCityMutation = useCreateGlobalCity();

  // Filter cities by selected country
  const availableCities = selectedCountry 
    ? allCities.filter(city => city?.countryCode === selectedCountry)
    : [];

  // Filter cities by search term
  const filteredCities = availableCities.filter(city =>
    city?.cityName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if search term matches any existing city exactly
  const exactMatch = availableCities.find(city => 
    city?.cityName.toLowerCase() === searchTerm.toLowerCase()
  );

  const handleCountryChange = (countryCode: string) => {
    if (countryCode === "REQUEST_NEW") {
      setShowCountryRequest(true);
      return;
    }
    onSelection(countryCode, ""); // Clear city when country changes
    setSearchTerm(""); // Clear search when country changes
  };

  const handleCityChange = (cityName: string) => {
    if (selectedCountry) {
      onSelection(selectedCountry, cityName);
      setSearchTerm("");
    }
  };

  const handleCreateNewCity = () => {
    if (!selectedCountry) {
      toast.error("Please select a country first");
      return;
    }
    
    if (!searchTerm.trim()) {
      toast.error("Please enter a city name");
      return;
    }

    // Check if city already exists
    if (exactMatch) {
      toast.error("This city already exists. Please select it from the list.");
      return;
    }

    // Use the search term as the new city name
    const cityName = searchTerm.trim();
    setNewCityName(cityName);
    setShowNewCityDialog(true);
  };

  const confirmCreateCity = async () => {
    if (selectedCountry && newCityName) {
      setIsCreatingCity(true);
      try {
        await createCityMutation({
          cityName: newCityName,
          countryCode: selectedCountry,
        });
        
        // Select the newly created city
        onSelection(selectedCountry, newCityName);
        
        toast.success(`City "${newCityName}" created successfully!`);
        setShowNewCityDialog(false);
        setNewCityName("");
        setSearchTerm("");
      } catch (error) {
        toast.error(`Failed to create city: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsCreatingCity(false);
      }
    }
  };

  const selectedCountryData = countries.find(c => c?.code === selectedCountry);
  const selectedCityData = allCities.find(c => 
    c?.countryCode === selectedCountry && c?.cityName === selectedCity
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
              <>
                {countries.map((country) => (
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
                ))}
                {countries.length > 0 && (
                  <SelectItem value="REQUEST_NEW" className="border-t border-gray-200">
                    <div className="flex items-center gap-2 text-orange-600">
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Request New Country</span>
                    </div>
                  </SelectItem>
                )}
              </>
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
          
          {/* Search/Create within country */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder={`Search or type new city in ${selectedCountryData?.name}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 p-0 h-auto focus-visible:ring-0"
              />
            </div>
            
            {/* Show create option when typing */}
            {searchTerm && !exactMatch && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800 flex-1">
                  <strong>"{searchTerm}"</strong> not found. Create as new city?
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateNewCity}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create
                </Button>
              </div>
            )}
            
            {/* Cities List */}
            <div className="max-h-48 overflow-y-auto">
              {citiesLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <Clock className="w-4 h-4 mx-auto mb-2" />
                  Loading cities...
                </div>
              ) : filteredCities.length === 0 && !searchTerm ? (
                <div className="text-center py-6 text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cities yet in {selectedCountryData?.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Type a city name above to create one</p>
                </div>
              ) : searchTerm && filteredCities.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No existing cities match "{searchTerm}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {filteredCities.map((city) => (
                    <button
                      key={city?.cityName}
                      type="button"
                      onClick={() => handleCityChange(city?.cityName || "")}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        selectedCity === city?.cityName
                          ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{city?.cityName}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {city?.tripCount} trips
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
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-600" />
              <div className="flex items-center gap-1">
                <span className="text-lg">{selectedCountryData?.flagEmoji}</span>
                <span className="font-medium">{selectedCountryData?.name}</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="font-medium">{selectedCity}</span>
              </div>
              {selectedCityData ? (
                <>
                  <span className="text-gray-400">•</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedCityData.tripCount} trips available
                  </Badge>
                </>
              ) : (
                <>
                  <span className="text-gray-400">•</span>
                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                    New city
                  </Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New City Confirmation Dialog */}
      <Dialog open={showNewCityDialog} onOpenChange={setShowNewCityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Create New City
            </DialogTitle>
            <DialogDescription>
              You're about to add "{newCityName}" as a new city in {selectedCountryData?.name} {selectedCountryData?.flagEmoji}. 
              This city will be available for all users to select.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">This will create a new city</p>
                    <p>
                      The city "{newCityName}" will be created in {selectedCountryData?.name} and made available for selection.
                      Make sure the spelling is correct.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex gap-3 justify-end">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowNewCityDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={confirmCreateCity}
                disabled={isCreatingCity}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isCreatingCity ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create "{newCityName}"
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Country Request Modal */}
      <CountryRequestModal 
        isOpen={showCountryRequest}
        onOpenChange={setShowCountryRequest}
        onRequestSubmitted={() => {
          setShowCountryRequest(false);
        }}
      />
    </div>
  );
}; 