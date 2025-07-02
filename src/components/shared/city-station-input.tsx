import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  MapPin, 
  Check, 
  Clock,
  Building2,
  Edit3,
  BookOpen,
  Plus,
  Trash2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDriverCitiesAndStations, type ReusableCity, type ReusableStation } from "@/services/supabase/reusable-cities-stations";

interface CityStationInputProps {
  selectedCityName?: string;
  selectedStations?: Array<{ name: string; address: string }>;
  onCityChange: (cityName: string, stations: Array<{ name: string; address: string }>) => void;
  label?: string;
}

export const CityStationInput = ({
  selectedCityName = "",
  selectedStations = [],
  onCityChange,
  label = "City"
}: CityStationInputProps) => {
  const [activeTab, setActiveTab] = useState<"manual" | "saved">("manual");
  const [searchTerm, setSearchTerm] = useState("");
  const [manualCityName, setManualCityName] = useState(selectedCityName);

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

  // Handle manual city name change
  const handleManualCityChange = (value: string) => {
    setManualCityName(value);
    onCityChange(value, selectedStations);
  };

  // Handle saved city selection
  const handleSavedCitySelect = (city: ReusableCity) => {
    const stations = city.stations.map(s => ({ name: s.name, address: s.address }));
    onCityChange(city.cityName, stations);
    setManualCityName(city.cityName);
  };

  // Handle station toggle for saved cities
  const handleStationToggle = (city: ReusableCity, station: ReusableStation) => {
    const isSelected = selectedStations.some(s => s.name === station.name);
    let newStations: Array<{ name: string; address: string }>;
    
    if (isSelected) {
      newStations = selectedStations.filter(s => s.name !== station.name);
    } else {
      newStations = [...selectedStations, { name: station.name, address: station.address }];
    }
    
    onCityChange(city.cityName, newStations);
  };

  return (
    <div className="space-y-3">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "manual" | "saved")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100">
          <TabsTrigger 
            value="manual" 
            className="flex items-center gap-2 data-[state=active]:bg-brand-orange data-[state=active]:text-white"
          >
            <Edit3 className="w-4 h-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger 
            value="saved" 
            className="flex items-center gap-2 data-[state=active]:bg-brand-orange data-[state=active]:text-white"
          >
            <BookOpen className="w-4 h-4" />
            Saved Cities ({reusableCities.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-3 mt-3">
          <div className="space-y-2">
            <Input
              value={manualCityName}
              onChange={(e) => handleManualCityChange(e.target.value)}
              placeholder="Enter city name..."
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Enter the city name manually. You can add stations using the station manager below.
            </p>
          </div>
        </TabsContent>
        
        {/* Saved Cities Tab */}
        <TabsContent value="saved" className="space-y-3 mt-3">
          {/* Search */}
          <div className="flex items-center gap-2 p-2 border rounded-lg">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search your saved cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 p-0 h-auto focus-visible:ring-0"
            />
          </div>
          
          {/* Cities List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <Clock className="w-4 h-4 mx-auto mb-2" />
                Loading cities...
              </div>
            ) : filteredCities.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {searchTerm ? "No cities found" : "No saved cities yet"}
                <p className="text-xs mt-1">Create cities using manual entry to save them for later</p>
              </div>
            ) : (
              filteredCities.map((city) => {
                const isSelected = selectedCityName === city.cityName;
                return (
                  <Card 
                    key={city.cityName} 
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <CardContent className="px-3">
                      {/* City Header */}
                      <div 
                        className="flex items-center justify-between mb-2"
                        onClick={() => handleSavedCitySelect(city)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="font-medium">{city.cityName}</div>
                            <div className="text-xs text-gray-500">
                              {city.stations.length} station{city.stations.length !== 1 ? 's' : ''} available
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-green-600" />}
                      </div>
                      
                      {/* Stations (show if city is selected) */}
                      {isSelected && city.stations.length > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          <div className="text-xs font-medium text-gray-600">
                            Select stations to include:
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {city.stations.map((station) => {
                              const isStationSelected = selectedStations.some(s => s.name === station.name);
                              return (
                                <button
                                  key={station.name}
                                  type="button"
                                  onClick={() => handleStationToggle(city, station)}
                                  className={`text-left p-2 rounded text-xs transition-colors ${
                                    isStationSelected 
                                      ? 'bg-blue-100 border border-blue-300 text-blue-800' 
                                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">{station.name}</div>
                                      {station.address && (
                                        <div className="text-gray-500">{station.address}</div>
                                      )}
                                    </div>
                                    {isStationSelected && <Check className="w-3 h-3 text-blue-600" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Station Management Section */}
      {selectedCityName && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Stations for {selectedCityName}</Label>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const newStation = { name: "", address: "" };
                const updatedStations = [...selectedStations, newStation];
                onCityChange(selectedCityName, updatedStations);
              }}
              className="bg-brand-orange hover:bg-brand-orange-600 text-white h-7"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Station
            </Button>
          </div>
          
          {/* Stations List */}
          <div className="space-y-2">
            {selectedStations.length === 0 ? (
              <div className="text-center p-4 border border-dashed border-gray-300 rounded-lg">
                <Building2 className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">No stations added yet</p>
                <p className="text-xs text-gray-400">Click "Add Station" to get started</p>
              </div>
            ) : (
              selectedStations.map((station, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Station name"
                        value={station.name}
                        onChange={(e) => {
                          const updatedStations = [...selectedStations];
                          updatedStations[index] = { ...station, name: e.target.value };
                          onCityChange(selectedCityName, updatedStations);
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const updatedStations = selectedStations.filter((_, i) => i !== index);
                          onCityChange(selectedCityName, updatedStations);
                        }}
                        className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Station address"
                      value={station.address}
                      onChange={(e) => {
                        const updatedStations = [...selectedStations];
                        updatedStations[index] = { ...station, address: e.target.value };
                        onCityChange(selectedCityName, updatedStations);
                      }}
                      className="text-xs"
                    />
                  </div>
                </Card>
              ))
            )}
          </div>
          
          {/* Summary */}
          {selectedStations.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-medium text-blue-800 mb-2">
                {selectedStations.length} station{selectedStations.length !== 1 ? 's' : ''} configured:
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedStations.map((station, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    {station.name || `Station ${index + 1}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 