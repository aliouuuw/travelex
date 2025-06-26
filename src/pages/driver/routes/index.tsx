import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Route, Clock, DollarSign, MapPin, ArrowRight, Edit, Eye, Users } from "lucide-react";
import { Link } from "react-router-dom";

// Types for intercity route templates
type Station = {
  id: number;
  name: string;
  address?: string;
};

type CityWithStations = {
  cityName: string;
  stations: Station[];
};

type RouteTemplate = {
  id: number;
  name: string;
  cities: CityWithStations[];
  estimatedDuration: string;
  basePrice: number;
  status: 'active' | 'draft';
  scheduledTrips: number;
  completedTrips: number;
  totalEarnings: number;
  createdAt: string;
};

// Mock data for intercity route templates
const mockDriverRoutes: RouteTemplate[] = [
  {
    id: 1,
    name: "Northern Express",
    cities: [
      {
        cityName: "Tamale",
        stations: [
          { id: 1, name: "Central Station", address: "Downtown Tamale" },
          { id: 2, name: "University Station", address: "University for Development Studies" },
          { id: 3, name: "Market Station", address: "Tamale Central Market" }
        ]
      },
      {
        cityName: "Kumasi",
        stations: [
          { id: 4, name: "Kejetia Terminal", address: "Kejetia Market Area" },
          { id: 5, name: "Tech Junction", address: "KNUST Area" },
          { id: 6, name: "Airport Station", address: "Near Kumasi Airport" },
          { id: 7, name: "Adum Station", address: "Adum Commercial Area" }
        ]
      },
      {
        cityName: "Accra",
        stations: [
          { id: 8, name: "Circle Station", address: "Kwame Nkrumah Circle" },
          { id: 9, name: "37 Station", address: "37 Military Hospital Area" },
          { id: 10, name: "Kaneshie Terminal", address: "Kaneshie Market" },
          { id: 11, name: "Achimota Station", address: "Achimota Mall" }
        ]
      }
    ],
    estimatedDuration: "8 hours",
    basePrice: 120,
    status: "active",
    scheduledTrips: 3,
    completedTrips: 24,
    totalEarnings: 2880,
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    name: "Eastern Corridor",
    cities: [
      {
        cityName: "Accra",
        stations: [
          { id: 12, name: "37 Station", address: "37 Military Hospital Area" },
          { id: 13, name: "Madina Station", address: "Madina Market" }
        ]
      },
      {
        cityName: "Koforidua",
        stations: [
          { id: 14, name: "Central Station", address: "Koforidua Town Center" },
          { id: 15, name: "New Juaben Station", address: "New Juaben Municipal" },
          { id: 16, name: "Polytechnic Station", address: "Koforidua Technical University" }
        ]
      }
    ],
    estimatedDuration: "2.5 hours",
    basePrice: 35,
    status: "active",
    scheduledTrips: 2,
    completedTrips: 18,
    totalEarnings: 630,
    createdAt: "2024-02-01"
  },
  {
    id: 3,
    name: "Western Route",
    cities: [
      {
        cityName: "Accra",
        stations: [
          { id: 17, name: "Circle Station", address: "Kwame Nkrumah Circle" },
          { id: 18, name: "Kasoa Station", address: "Kasoa Central" }
        ]
      },
      {
        cityName: "Cape Coast",
        stations: [
          { id: 19, name: "Central Terminal", address: "Cape Coast Castle Area" },
          { id: 20, name: "University Station", address: "University of Cape Coast" }
        ]
      },
      {
        cityName: "Takoradi",
        stations: [
          { id: 21, name: "Market Circle", address: "Takoradi Market Circle" },
          { id: 22, name: "Harbor Station", address: "Takoradi Harbor" }
        ]
      }
    ],
    estimatedDuration: "5 hours",
    basePrice: 80,
    status: "draft",
    scheduledTrips: 0,
    completedTrips: 0,
    totalEarnings: 0,
    createdAt: "2024-02-15"
  }
];

// RouteFlowChart Component for intercity route templates
const RouteFlowChart = ({ route }: { route: RouteTemplate }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
      <div className="flex items-start justify-center min-w-max pr-6 md:pr-0">
        {route.cities.map((city, cityIndex) => (
          <div key={city.cityName} className="flex items-center">
            {/* City Node */}
            <div className="flex flex-col items-center h-80">
              {/* City Header */}
              <div className={`
                flex items-center justify-center w-32 h-16 rounded-xl border-2 shadow-sm
                ${cityIndex === 0 
                  ? 'bg-green-100 border-green-300 text-green-800' 
                  : cityIndex === route.cities.length - 1
                  ? 'bg-red-100 border-red-300 text-red-800'
                  : 'bg-blue-100 border-blue-300 text-blue-800'}
              `}>
                <div className="text-center">
                  <div className="font-semibold text-sm">{city.cityName}</div>
                  <div className="text-xs opacity-75">
                    {cityIndex === 0 ? 'Origin' : cityIndex === route.cities.length - 1 ? 'Destination' : 'Stop'}
                  </div>
                </div>
              </div>
              
              {/* Available Stations - Fixed Height Container */}
              <div className="mt-4 flex flex-col h-60 w-full">
                <div className="text-xs font-medium text-gray-600 mb-2 text-center">
                  Available Stations ({city.stations.length})
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {city.stations.slice(0, 3).map((station) => (
                    <div
                      key={station.id}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-center min-w-[120px] bg-white border border-gray-300 text-gray-800"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{station.name}</span>
                      </div>
                      {station.address && (
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {station.address}
                        </div>
                      )}
                    </div>
                  ))}
                  {city.stations.length > 3 && (
                    <div className="text-xs text-gray-500 text-center pt-2">
                      +{city.stations.length - 3} more stations
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Arrow Connector */}
            {cityIndex < route.cities.length - 1 && (
              <div className="flex items-center justify-center mx-6 self-start mt-8">
                <ArrowRight className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// DriverRouteCard Component - Updated for intercity route templates
const DriverRouteCard = ({ route }: { route: RouteTemplate }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card className="premium-card hover:shadow-premium-hover transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Route className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg font-heading">{route.name}</CardTitle>
                <Badge className={getStatusColor(route.status)}>
                  {route.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{route.estimatedDuration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>₵{route.basePrice}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{route.scheduledTrips} scheduled</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/driver/routes/${route.id}/trips`}>
                <Eye className="w-4 h-4 mr-1" />
                View Trips
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/driver/routes/${route.id}/edit`}>
                <Edit className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RouteFlowChart route={route} />
        
        {/* Driver Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{route.completedTrips}</p>
            <p className="text-xs text-muted-foreground">Completed Trips</p>
          </div>
                      <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{route.scheduledTrips}</p>
              <p className="text-xs text-muted-foreground">Scheduled Trips</p>
            </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-orange">₵{route.totalEarnings}</p>
            <p className="text-xs text-muted-foreground">Total Earnings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DriverRoutesPage() {
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'draft'>('all');

  const filteredRoutes = mockDriverRoutes.filter(route => 
    selectedStatus === 'all' || route.status === selectedStatus
  );

  const stats = {
    total: mockDriverRoutes.length,
    active: mockDriverRoutes.filter(r => r.status === 'active').length,
    draft: mockDriverRoutes.filter(r => r.status === 'draft').length,
    totalEarnings: mockDriverRoutes.reduce((acc, r) => acc + r.totalEarnings, 0),
    scheduledTrips: mockDriverRoutes.reduce((acc, r) => acc + r.scheduledTrips, 0)
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            My Route Templates
          </h1>
          <p className="text-muted-foreground">
            Create intercity route templates to schedule trips between cities
          </p>
        </div>
        <Button 
          asChild 
          className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all"
        >
          <Link to="/driver/routes/edit" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Route
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <Route className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Routes</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Trips</p>
                <p className="text-2xl font-bold text-foreground">{stats.scheduledTrips}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                <DollarSign className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-foreground">₵{stats.totalEarnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
                <Route className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Routes</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'draft'] as const).map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatus(status)}
            className={selectedStatus === status ? "bg-brand-orange text-white hover:bg-brand-orange-600" : ""}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <Badge variant="secondary" className="ml-2">
              {status === 'active' ? stats.active : 
               status === 'draft' ? stats.draft : stats.total}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Routes List */}
      <div className="space-y-6">
        {filteredRoutes.map((route) => (
          <DriverRouteCard key={route.id} route={route} />
        ))}
        
        {filteredRoutes.length === 0 && (
          <Card className="premium-card">
            <CardContent className="p-12 text-center">
              <Route className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                No routes found
              </h3>
              <p className="text-muted-foreground mb-4">
                {selectedStatus === 'all' 
                  ? "Get started by creating your first route" 
                  : `No ${selectedStatus} routes found`}
              </p>
              <Button 
                asChild 
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                <Link to="/driver/routes/edit" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Route
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 