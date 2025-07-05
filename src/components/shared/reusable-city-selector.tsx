import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MapPin, 
  Plus, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Building2 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDriverCitiesAndStations, type ReusableCity, type ReusableStation } from "@/services/convex/citiesStations";

interface ReusableCitySelectorProps {
  selectedCityName?: string;
  selectedStations?: ReusableStation[];
  onCitySelect: (cityName: string, stations: ReusableStation[]) => void;
  onManualEntry?: (cityName: string) => void;
  label?: string;
}

export const ReusableCitySelector = ({
  selectedCityName,
  selectedStations = [],
  onCitySelect,
  onManualEntry,
  label = "Select City"
}: ReusableCitySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualCityName, setManualCityName] = useState("");

  // Fetch reusable cities and stations
  const { 
    data: reusableCities = [], 
    isLoading 
  } = useQuery<ReusableCity[], Error>({
    queryKey: ['driver-cities-stations'],
    queryFn: getDriverCitiesAndStations,
    retry: 1
  });

  // Filter cities based on search term
  const filteredCities = reusableCities.filter(city =>
    city.cityName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCityExpansion = (cityName: string) => {
    const newExpanded = new Set(expandedCities);
    if (newExpanded.has(cityName)) {
      newExpanded.delete(cityName);
    } else {
      newExpanded.add(cityName);
    }
    setExpandedCities(newExpanded);
  };

  const handleCitySelect = (city: ReusableCity) => {
    onCitySelect(city.cityName, city.stations);
    setIsOpen(false);
  };

  const handleStationToggle = (city: ReusableCity, station: ReusableStation) => {
    const isSelected = selectedStations.some(s => s.name === station.name);
    let newStations: ReusableStation[];
    
    if (isSelected) {
      newStations = selectedStations.filter(s => s.name !== station.name);
    } else {
      newStations = [...selectedStations, station];
    }
    
    onCitySelect(city.cityName, newStations);
  };

  // Handle manual entry
  const handleManualEntry = () => {
    setIsManualMode(true);
    setIsOpen(false);
    setManualCityName(selectedCityName || "");
  };

  const handleManualSave = () => {
    if (manualCityName.trim()) {
      if (onManualEntry) {
        onManualEntry(manualCityName.trim());
      }
      setIsManualMode(false);
    }
  };

  const handleManualCancel = () => {
    setIsManualMode(false);
    setManualCityName("");
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      {/* Manual Entry Mode */}
      {isManualMode ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={manualCityName}
              onChange={(e) => setManualCityName(e.target.value)}
              placeholder="Enter city name..."
              className="flex-1"
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={handleManualSave}
              disabled={!manualCityName.trim()}
              className="bg-brand-orange hover:bg-brand-orange-600 text-white"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleManualCancel}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            After saving, you can add stations using the station manager below
          </p>
        </div>
      ) : (
        /* Selected City Display */
        <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full justify-between text-left h-auto p-4 border-2 transition-all ${
            selectedCityName 
              ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50' 
              : 'border-dashed border-gray-300 hover:border-brand-orange hover:bg-brand-orange/5'
          }`}
        >
          <div className="flex items-center gap-3">
            {selectedCityName ? (
              <>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-blue-900">{selectedCityName}</div>
                  <div className="text-xs text-blue-600">
                    {selectedStations.length} station{selectedStations.length !== 1 ? 's' : ''} selected
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-700">Choose from saved cities</div>
                  <div className="text-xs text-gray-500">Or create a new city manually</div>
                </div>
              </>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {/* Dropdown */}
        {isOpen && (
          <Card className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-hidden z-50 bg-white">
            <CardHeader className="p-4 pb-2 border-b">
              <div className="space-y-3">
                {/* Manual Entry Option */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-brand-orange" />
                      <span className="font-medium text-sm text-gray-700">Create New City</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleManualEntry}
                      className="bg-brand-orange hover:bg-brand-orange-600 text-white h-7"
                    >
                      Manual Entry
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Enter city name and stations manually
                  </p>
                </div>
                
                {/* Search Saved Cities */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search saved cities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-0 p-0 h-auto focus-visible:ring-0"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Choose from previously created cities and stations
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Clock className="w-4 h-4 mx-auto mb-2" />
                  Loading cities...
                </div>
              ) : filteredCities.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  {searchTerm ? "No cities found" : "No cities created yet"}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredCities.map((city) => (
                    <div key={city.cityName} className="border rounded-lg overflow-hidden">
                      {/* City Header */}
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                        <button
                          type="button"
                          onClick={() => handleCitySelect(city)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="font-medium">{city.cityName}</div>
                            <div className="text-xs text-muted-foreground">
                              {city.stations.length} station{city.stations.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          {selectedCityName === city.cityName && (
                            <Check className="w-4 h-4 text-green-600 ml-auto" />
                          )}
                        </button>
                        
                        {city.stations.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCityExpansion(city.cityName)}
                            className="p-1 h-auto"
                          >
                            {expandedCities.has(city.cityName) ? 
                              <ChevronUp className="w-4 h-4" /> : 
                              <ChevronDown className="w-4 h-4" />
                            }
                          </Button>
                        )}
                      </div>
                      
                      {/* Stations (when expanded) */}
                      {expandedCities.has(city.cityName) && selectedCityName === city.cityName && (
                        <div className="border-t bg-gray-50/50 p-2 space-y-1">
                          <div className="text-xs font-medium text-gray-600 mb-2 px-1">
                            Select Stations:
                          </div>
                          {city.stations.map((station: ReusableStation) => {
                            const isSelected = selectedStations.some(s => s.name === station.name);
                            return (
                              <button
                                key={station.name}
                                type="button"
                                onClick={() => handleStationToggle(city, station)}
                                className={`w-full text-left p-2 rounded border text-xs transition-colors ${
                                  isSelected 
                                    ? 'bg-blue-50 border-blue-200 text-blue-800' 
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{station.name}</div>
                                    {station.address && (
                                      <div className="text-gray-500 text-[10px]">{station.address}</div>
                                    )}
                                  </div>
                                  {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      )}

      {/* Selected Stations Display */}
      {selectedCityName && selectedStations.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-gray-600 mb-2">Selected Stations:</div>
          <div className="flex flex-wrap gap-1">
            {selectedStations.map((station) => (
              <Badge key={station.name} variant="secondary" className="text-xs">
                {station.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 