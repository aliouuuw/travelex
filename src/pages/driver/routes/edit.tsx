import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

// Types
type Station = {
  id?: number;
  name: string;
  address: string;
};

type CitySection = {
  cityName: string;
  stations: Station[];
};

type InterCityFare = {
  fromCity: string;
  toCity: string;
  fare: number;
};

type RouteFormData = {
  name: string;
  estimatedDuration: string;
  basePrice: number;
  status: 'active' | 'draft';
  cities: CitySection[];
  intercityFares: InterCityFare[];
};

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
    if (newStation.name && newStation.address) {
      onAdd(newStation);
      setNewStation({ name: "", address: "" });
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
        <span className="font-medium text-sm">Stations in {cityName}</span>
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
          placeholder="New station name"
          className="h-8 text-sm"
        />
        <Input
          value={newStation.address}
          onChange={(e) => setNewStation(prev => ({ ...prev, address: e.target.value }))}
          placeholder="Station address/location"
          className="h-8 text-sm"
        />
        <Button
          type="button"
          onClick={handleAddStation}
          size="sm"
          variant="outline"
          className="w-full bg-brand-dark-blue text-white hover:bg-brand-dark-blue-600"
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
  cities: CitySection[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, city: CitySection) => void;
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
              <div className="flex items-center gap-3">
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
                <Input
                  value={city.cityName}
                  onChange={(e) => onUpdate(cityIndex, { ...city, cityName: e.target.value })}
                  placeholder="City name"
                  className="font-medium"
                />
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
  cities: CitySection[];
  fares: InterCityFare[];
  onChange: (fares: InterCityFare[]) => void;
}) => {
  // Generate all possible city pairs
  const generateCityPairs = () => {
    const pairs: { from: string; to: string }[] = [];
    for (let i = 0; i < cities.length - 1; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        pairs.push({ from: cities[i].cityName, to: cities[j].cityName });
      }
    }
    return pairs;
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

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-brand-orange" />
          Intercity Fares
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cityPairs.map(({ from, to }, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium text-sm">{from}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-sm">{to}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">₵</span>
              <Input
                type="number"
                value={getFare(from, to)}
                onChange={(e) => updateFare(from, to, parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-20 h-8 text-sm"
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
const RoutePreview = ({ cities }: { cities: CitySection[] }) => {
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
                    flex items-center justify-center w-20 h-12 rounded-lg border-2 shadow-sm
                    ${cityIndex === 0 
                      ? 'bg-green-100 border-green-300 text-green-800' 
                      : cityIndex === cities.length - 1
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'}
                  `}>
                    <span className="text-sm font-medium">{city.cityName || `City ${cityIndex + 1}`}</span>
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

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<RouteFormData>({
    defaultValues: {
      name: "",
      estimatedDuration: "",
      basePrice: 0,
      status: 'draft',
      cities: [
        { cityName: "", stations: [] },
        { cityName: "", stations: [] }
      ],
      intercityFares: []
    }
  });

  const { append: appendCity, remove: removeCity, move: moveCity } = useFieldArray({
    control,
    name: "cities"
  });

  const watchedCities = watch("cities");
  const watchedFares = watch("intercityFares");

  const onSubmit = (data: RouteFormData) => {
    console.log("Route data:", data);
    // TODO: Save to backend
    navigate("/driver/routes");
  };

  const addCity = () => {
    appendCity({ cityName: "", stations: [] });
  };

  const reorderCities = (fromIndex: number, toIndex: number) => {
    moveCity(fromIndex, toIndex);
  };

  const updateCity = async (index: number, city: CitySection) => {
    setValue(`cities.${index}`, city, { shouldDirty: true });
    await trigger(`cities.${index}`);
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
                  <select {...field} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                  </select>
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