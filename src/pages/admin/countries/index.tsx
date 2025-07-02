import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Globe, 
  Users, 
  MapPin, 
  Edit2, 
  Trash2,
  Check,
  X,
  Clock,
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAvailableCountries, 
  type Country,
  getCountryRequests,
  approveCountryRequest,
  rejectCountryRequest,
  createCountry,
  type CountryRequest
} from "@/services/supabase/countries";
import { toast } from "sonner";

// Services are now imported from @/services/countries

const CountryCard = ({ country }: { country: Country }) => {
  return (
    <Card className="premium-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{country.flagEmoji}</div>
            <div>
              <h3 className="font-semibold">{country.name}</h3>
              <p className="text-sm text-gray-500">{country.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>{country.cityCount} cities</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-600" />
            <span>{country.tripCount} trips</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CountryRequestCard = ({ request }: { request: CountryRequest }) => {
  const queryClient = useQueryClient();
  
  const approveMutation = useMutation({
    mutationFn: approveCountryRequest,
    onSuccess: () => {
      toast.success("Country request approved!");
      queryClient.invalidateQueries({ queryKey: ['country-requests'] });
      queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
    onError: () => {
      toast.error("Failed to approve country request");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: rejectCountryRequest,
    onSuccess: () => {
      toast.success("Country request rejected");
      queryClient.invalidateQueries({ queryKey: ['country-requests'] });
    },
    onError: () => {
      toast.error("Failed to reject country request");
    }
  });

  return (
    <Card className="border-orange-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium">{request.countryName} ({request.countryCode})</h4>
            <p className="text-sm text-gray-500">Requested by {request.requesterName}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-gray-600 italic">"{request.reason}"</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => approveMutation.mutate(request.id)}
            disabled={approveMutation.isPending}
          >
            <Check className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => rejectMutation.mutate(request.id)}
            disabled={rejectMutation.isPending}
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AddCountryForm = ({ onAdd }: { onAdd: (country: Country) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    flagEmoji: ""
  });

  const createMutation = useMutation({
    mutationFn: createCountry,
    onSuccess: () => {
      toast.success("Country added successfully!");
      setFormData({ name: "", code: "", flagEmoji: "" });
      setIsOpen(false);
      onAdd({
        name: formData.name,
        code: formData.code,
        flagEmoji: formData.flagEmoji,
        cityCount: 0,
        tripCount: 0
      });
    },
    onError: () => {
      toast.error("Failed to add country");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error("Country name and code are required");
      return;
    }
    createMutation.mutate(formData);
  };

  if (!isOpen) {
    return (
      <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
        <CardContent className="p-6">
          <Button 
            onClick={() => setIsOpen(true)}
            variant="ghost" 
            className="w-full h-full text-gray-500 hover:text-blue-600"
          >
            <Plus className="w-8 h-8 mb-2" />
            <div>Add New Country</div>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-300">
      <CardHeader>
        <CardTitle className="text-lg">Add New Country</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Country Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Morocco"
            />
          </div>
          
          <div>
            <Label htmlFor="code">Country Code (ISO 3166-1)</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., MA"
              maxLength={2}
            />
          </div>
          
          <div>
            <Label htmlFor="flagEmoji">Flag Emoji (Optional)</Label>
            <Input
              id="flagEmoji"
              value={formData.flagEmoji}
              onChange={(e) => setFormData(prev => ({ ...prev, flagEmoji: e.target.value }))}
              placeholder="🇲🇦"
              maxLength={2}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              Create Country
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default function CountriesManagement() {
  const queryClient = useQueryClient();
  
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: getAvailableCountries
  });

  const { data: countryRequests = [] } = useQuery<CountryRequest[]>({
    queryKey: ['country-requests'],
    queryFn: () => getCountryRequests()
  });

  const handleCountryAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['countries'] });
  };

  const pendingRequests = countryRequests.filter(r => r.status === 'pending');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Countries Management</h1>
          <p className="text-gray-600">Manage supported countries and review expansion requests</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{countries.length}</div>
            <div className="text-sm text-gray-500">Active Countries</div>
          </div>
          {pendingRequests.length > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{pendingRequests.length}</div>
              <div className="text-sm text-gray-500">Pending Requests</div>
            </div>
          )}
        </div>
      </div>

      {/* Country Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold">Pending Country Requests</h2>
            <Badge variant="outline" className="bg-orange-50 text-orange-700">
              {pendingRequests.length}
            </Badge>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map((request) => (
              <CountryRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Active Countries Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Active Countries</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {countries.map((country) => (
            <CountryCard key={country.code} country={country} />
          ))}
          <AddCountryForm onAdd={handleCountryAdded} />
        </div>
      </div>
    </div>
  );
} 