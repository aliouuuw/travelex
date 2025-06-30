import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  MapPin, 
  ArrowRight, 
  Save, 
  Eye,
  DollarSign,
  Route as RouteIcon
} from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  createRouteTemplate, 
  updateRouteTemplate, 
  getRouteTemplateById,
  type RouteTemplateFormData,
  type Station,
  type CityWithStations,
  type InterCityFare
} from "@/services/route-templates";
import { getAvailableCountries, type Country } from "@/services/countries";
import { EnhancedCitySelector } from "@/components/shared/enhanced-city-selector";
import { toast } from "sonner";

// Reusable Station Manager Component
const StationManager = ({ 
  stations, 
  onAdd, 
  onRemove, 
  onUpdate,
  cityName 
}: {
  stations: Station[];
  onAdd: (station: Station) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, station: Station) => void;
  cityName: string;
}) => {
  const [newStation, setNewStation] = useState({ name: "", address: "" });
  
  const handleAddStation = () => {
    if (newStation.name.trim() && newStation.address.trim()) {
      onAdd({ 
        name: newStation.name.trim(), 
        address: newStation.address.trim() 
      });
      setNewStation({ name: "", address: "" });
      toast.success(`Added station "${newStation.name.trim()}" to ${cityName}`);
    } else {
      toast.error("Please fill in both station name and address");
    }
  };

  const handleStationUpdate = (index: number, field: 'name' | 'address', value: string) => {
    const updatedStation = { ...stations[index], [field]: value };
    onUpdate(index, updatedStation);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-sm">
          {cityName ? `Stations in ${cityName}` : "Add stations (select city first)"}
        </span>
        <Badge variant="secondary">{stations.length}</Badge>
      </div>
      
      {/* Existing Stations */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {stations.map((station, index) => (
          <div key={`station-${index}-${station.name}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <div className="flex-1 space-y-1">
              <Input
                value={station.name || ""}
                onChange={(e) => handleStationUpdate(index, 'name', e.target.value)}
                placeholder="Station name"
                className="h-8 text-sm"
              />
              <Input
                value={station.address || ""}
                onChange={(e) => handleStationUpdate(index, 'address', e.target.value)}
                placeholder="Address/Location"
                className="h-8 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      
      {/* Add New Station */}
      <div className="border-t pt-3 space-y-2">
        <Input
          value={newStation.name}
          onChange={(e) => setNewStation(prev => ({ ...prev, name: e.target.value }))}
          placeholder={cityName ? "New station name" : "Select city first"}
          className="h-8 text-sm"
          disabled={!cityName}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newStation.name.trim() && newStation.address.trim()) {
              handleAddStation();
            }
          }}
        />
        <Input
          value={newStation.address}
          onChange={(e) => setNewStation(prev => ({ ...prev, address: e.target.value }))}
          placeholder={cityName ? "Station address/location" : "Select city first"}
          className="h-8 text-sm"
          disabled={!cityName}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newStation.name.trim() && newStation.address.trim()) {
              handleAddStation();
            }
          }}
        />
        <Button
          type="button"
          onClick={handleAddStation}
          size="sm"
          variant="outline"
          className="w-full bg-brand-dark-blue text-white hover:bg-brand-dark-blue-600 transition-colors"
          disabled={!cityName || !newStation.name.trim() || !newStation.address.trim()}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Station
        </Button>
      </div>
    </div>
  );
};

// City Manager Component with Drag-and-Drop
const CityManager = ({ 
  cities, 
  onAdd, 
  onRemove, 
  onUpdate, 
  onReorder 
}: {
  cities: CityWithStations[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, city: CityWithStations) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorder(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {cities.map((city, cityIndex) => (
        <Card 
          key={cityIndex} 
          className={`premium-card transition-all ${draggedIndex === cityIndex ? 'opacity-50' : ''}`}
          draggable
          onDragStart={() => handleDragStart(cityIndex)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, cityIndex)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium
                  ${cityIndex === 0 
                    ? 'bg-green-100 text-green-800' 
                    : cityIndex === cities.length - 1
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'}
                `}>
                  {cityIndex + 1}
                </div>
                
                {/* City Selection */}
                <div className="flex-1">
                  <EnhancedCitySelector
                    selectedCountry={city.countryCode}
                    selectedCity={city.cityName}
                    onSelection={(countryCode: string, cityName: string) => {
                      onUpdate(cityIndex, { 
                        ...city,
                        cityName, 
                        countryCode,
                        stations: city.stations // Keep existing stations
                      });
                    }}
                    label=""
                    placeholder="Select country and city..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cityIndex === 0 && <Badge variant="outline" className="text-green-600">Origin</Badge>}
                {cityIndex === cities.length - 1 && cities.length > 1 && (
                  <Badge variant="outline" className="text-red-600">Destination</Badge>
                )}
                {cityIndex !== 0 && cityIndex !== cities.length - 1 && (
                  <Badge variant="outline">Stop</Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(cityIndex)}
                  disabled={cities.length <= 2}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StationManager
              stations={city.stations}
              cityName={city.cityName}
              onAdd={(station) => {
                const updatedCity = {
                  ...city,
                  stations: [...city.stations, station]
                };
                onUpdate(cityIndex, updatedCity);
              }}
              onRemove={(stationIndex) => {
                const updatedCity = {
                  ...city,
                  stations: city.stations.filter((_, i) => i !== stationIndex)
                };
                onUpdate(cityIndex, updatedCity);
              }}
              onUpdate={(stationIndex, station) => {
                const updatedStations = [...city.stations];
                updatedStations[stationIndex] = station;
                const updatedCity = { ...city, stations: updatedStations };
                onUpdate(cityIndex, updatedCity);
              }}
            />
          </CardContent>
        </Card>
      ))}
      
      <Button
        type="button"
        onClick={onAdd}
        variant="outline"
        className="w-full h-16 border-2 border-dashed border-gray-300 hover:border-brand-orange hover:bg-brand-orange/5"
      >
        <Plus className="w-5 h-5 mr-2" />
        Add City
      </Button>
    </div>
  );
};

// Intercity Fare Manager
const InterCityFareManager = ({ 
  cities, 
  fares, 
  onChange 
}: {
  cities: CityWithStations[];
  fares: InterCityFare[];
  onChange: (fares: InterCityFare[]) => void;
}) => {
  // Generate city pairs with proper ordering: segments first, then total route
  const generateCityPairs = () => {
    const segments: { from: string; to: string; isTotal: boolean }[] = [];
    
    // Add individual segments (adjacent cities)
    for (let i = 0; i < cities.length - 1; i++) {
      segments.push({ 
        from: cities[i].cityName, 
        to: cities[i + 1].cityName, 
        isTotal: false 
      });
    }
    
    // Add origin to destination (total route) if more than 2 cities
    if (cities.length > 2) {
      segments.push({ 
        from: cities[0].cityName, 
        to: cities[cities.length - 1].cityName, 
        isTotal: true 
      });
    }
    
    return segments;
  };

  const cityPairs = generateCityPairs();

  const updateFare = (fromCity: string, toCity: string, fare: number) => {
    const updatedFares = fares.filter(f => !(f.fromCity === fromCity && f.toCity === toCity));
    if (fare > 0) {
      updatedFares.push({ fromCity, toCity, fare });
    }
    onChange(updatedFares);
  };

  const getFare = (fromCity: string, toCity: string) => {
    return fares.find(f => f.fromCity === fromCity && f.toCity === toCity)?.fare || 0;
  };

  // Calculate total fare from origin to destination by summing segments
  const calculateTotalFare = () => {
    if (cities.length < 2) return 0;
    
    let totalFare = 0;
    for (let i = 0; i < cities.length - 1; i++) {
      const fromCity = cities[i].cityName;
      const toCity = cities[i + 1].cityName;
      totalFare += getFare(fromCity, toCity);
    }
    return totalFare;
  };

  // Auto-calculate and set the origin-to-destination fare
  const autoCalculateOriginToDestination = () => {
    if (cities.length < 2) {
      toast.error("Add at least 2 cities to auto-calculate fares");
      return;
    }

    const originCity = cities[0].cityName;
    const destinationCity = cities[cities.length - 1].cityName;
    
    if (!originCity || !destinationCity) {
      toast.error("Please name your origin and destination cities first");
      return;
    }

    const totalFare = calculateTotalFare();
    
    if (totalFare === 0) {
      toast.error("Set individual segment fares first to auto-calculate total");
      return;
    }

    updateFare(originCity, destinationCity, totalFare);
    toast.success(`Auto-calculated ${originCity} → ${destinationCity}: ₵${totalFare}`);
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-orange" />
            Intercity Fares
          </CardTitle>
          {cities.length >= 2 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={autoCalculateOriginToDestination}
              className="text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Auto-Calculate Total
            </Button>
          )}
        </div>
        {cities.length >= 2 && (
          <p className="text-sm text-muted-foreground">
            Auto-calculate will set {cities[0]?.cityName || "Origin"} → {cities[cities.length - 1]?.cityName || "Destination"} 
            fare by summing all segment prices (Total: ₵{calculateTotalFare()})
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {cityPairs.map(({ from, to, isTotal }, index) => (
          <div 
            key={index} 
            className={`
              flex items-center gap-3 p-3 rounded-lg transition-all
              ${isTotal 
                ? 'bg-brand-dark-blue/10 border-2 border-brand-dark-blue/30 shadow-sm' 
                : 'bg-gray-50 hover:bg-gray-100'
              }
            `}
          >
            <div className="flex items-center gap-2 flex-1">
              {isTotal && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-dark-blue text-white text-xs font-bold mr-2">
                  T
                </div>
              )}
              <span className={`font-medium text-sm ${isTotal ? 'text-brand-dark-blue' : ''}`}>
                {from}
              </span>
              <ArrowRight className={`w-4 h-4 ${isTotal ? 'text-brand-dark-blue' : 'text-gray-400'}`} />
              <span className={`font-medium text-sm ${isTotal ? 'text-brand-dark-blue' : ''}`}>
                {to}
              </span>
              {isTotal && (
                <Badge variant="secondary" className="ml-2 bg-brand-dark-blue/20 text-brand-dark-blue text-xs">
                  Total Route
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isTotal ? 'text-brand-dark-blue font-medium' : ''}`}>₵</span>
              <Input
                type="number"
                value={getFare(from, to)}
                onChange={(e) => updateFare(from, to, parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={`
                  w-20 h-8 text-sm 
                  ${isTotal 
                    ? 'border-brand-dark-blue focus:border-brand-dark-blue focus:ring-brand-dark-blue/20 font-medium' 
                    : ''
                  }
                `}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        ))}
        {cityPairs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add at least 2 cities to configure intercity fares
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Route Preview Component
const RoutePreview = ({ cities }: { cities: CityWithStations[] }) => {
  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-600" />
          Route Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
          <div className="flex items-center justify-center min-w-max gap-4">
            {cities.map((city, cityIndex) => (
              <div key={cityIndex} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className={`
                    flex items-center justify-center w-32 h-16 rounded-lg border-2 shadow-sm relative
                    ${cityIndex === 0 
                      ? 'bg-green-100 border-green-300 text-green-800' 
                      : cityIndex === cities.length - 1
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'}
                  `}>
                    <div className="text-center">
                      <div className="text-sm font-medium">
                        {city.cityName || `City ${cityIndex + 1}`}
                      </div>
                      {city.countryCode && (
                        <div className="text-xs opacity-75 flex items-center justify-center gap-1 mt-1">
                          {city.flagEmoji && <span>{city.flagEmoji}</span>}
                          <span>{city.countryCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {city.stations.length} stations
                  </Badge>
                </div>
                {cityIndex < cities.length - 1 && (
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function RouteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  // Load existing route data for editing
  const { data: existingRoute } = useQuery({
    queryKey: ['route-template', id],
    queryFn: () => getRouteTemplateById(id!),
    enabled: isEditing,
  });

  // Fetch countries for proper country information handling
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['available-countries'],
    queryFn: getAvailableCountries,
  });

  const { control, handleSubmit, watch, setValue, trigger, reset, formState: { errors } } = useForm<RouteTemplateFormData>({
    defaultValues: {
      name: "",
      estimatedDuration: "",
      basePrice: 0,
      status: 'draft',
      cities: [
        { cityName: "", countryCode: "", countryName: "", flagEmoji: "", stations: [] },
        { cityName: "", countryCode: "", countryName: "", flagEmoji: "", stations: [] }
      ],
      intercityFares: []
    }
  });

  // Reset form when existing route data loads
  useEffect(() => {
    if (existingRoute) {
      reset({
        name: existingRoute.name,
        estimatedDuration: existingRoute.estimatedDuration,
        basePrice: existingRoute.basePrice,
        status: existingRoute.status,
        cities: existingRoute.cities,
        intercityFares: existingRoute.intercityFares
      });
    }
  }, [existingRoute, reset]);

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: createRouteTemplate,
    onSuccess: () => {
      toast.success("Route template created successfully!");
      navigate("/driver/routes");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create route template: ${error.message}`);
    }
  });

  // Update route mutation
  const updateRouteMutation = useMutation({
    mutationFn: ({ id, routeData }: { id: string; routeData: RouteTemplateFormData }) => 
      updateRouteTemplate(id, routeData),
    onSuccess: () => {
      toast.success("Route template updated successfully!");
      navigate("/driver/routes");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update route template: ${error.message}`);
    }
  });

  const { append: appendCity, remove: removeCity, move: moveCity } = useFieldArray({
    control,
    name: "cities"
  });

  const watchedCities = watch("cities");
  const watchedFares = watch("intercityFares");

  const onSubmit = (data: RouteTemplateFormData) => {
    if (isEditing) {
      updateRouteMutation.mutate({ id: id!, routeData: data });
    } else {
      createRouteMutation.mutate(data);
    }
  };

  const addCity = () => {
    appendCity({ 
      cityName: "", 
      countryCode: "",
      countryName: "",
      flagEmoji: "",
      stations: [] 
    });
  };

  const reorderCities = (fromIndex: number, toIndex: number) => {
    moveCity(fromIndex, toIndex);
  };

  const updateCity = async (index: number, city: CityWithStations) => {
    // Ensure we have all required country information
    const selectedCountry = countries?.find(c => c.code === city.countryCode);
    if (selectedCountry && city.countryCode && city.cityName) {
      const updatedCity = {
        ...city,
        countryName: selectedCountry.name,
        flagEmoji: selectedCountry.flagEmoji
      };
      setValue(`cities.${index}`, updatedCity, { shouldDirty: true });
      await trigger(`cities.${index}`);
    } else {
      setValue(`cities.${index}`, city, { shouldDirty: true });
      await trigger(`cities.${index}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {isEditing ? 'Edit Route Template' : 'Create Route Template'}
          </h1>
          <p className="text-muted-foreground">
            Design your intercity route with cities, stations, and pricing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/driver/routes">Cancel</Link>
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)}
            className="bg-brand-orange hover:bg-brand-orange-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Create Route'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RouteIcon className="w-5 h-5 text-brand-orange" />
              Route Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Route Name</Label>
              <Controller
                name="name"
                control={control}
                rules={{ required: "Route name is required" }}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="name"
                    placeholder="e.g., Northern Express"
                    className={errors.name ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Estimated Duration</Label>
              <Controller
                name="estimatedDuration"
                control={control}
                rules={{ required: "Duration is required" }}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="estimatedDuration"
                    placeholder="e.g., 8 hours"
                    className={errors.estimatedDuration ? "border-red-500" : ""}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (₵)</Label>
              <Controller
                name="basePrice"
                control={control}
                rules={{ required: "Base price is required", min: 0 }}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="120.00"
                    className={errors.basePrice ? "border-red-500" : ""}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-10 px-3 bg-background">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Route Preview */}
        <RoutePreview cities={watchedCities} />

        {/* Cities Management */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Cities & Stations
              <Badge variant="secondary">{watchedCities.length} cities</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CityManager
              cities={watchedCities}
              onAdd={addCity}
              onRemove={removeCity}
              onUpdate={updateCity}
              onReorder={reorderCities}
            />
          </CardContent>
        </Card>

        {/* Intercity Fares */}
        <InterCityFareManager
          cities={watchedCities}
          fares={watchedFares}
          onChange={(fares) => setValue("intercityFares", fares)}
        />
      </form>
    </div>
  );
} 