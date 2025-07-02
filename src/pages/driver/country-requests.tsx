import { useQuery } from "@tanstack/react-query";
import { getMyCountryRequests } from "@/services/supabase/countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountryRequestModal } from "@/components/shared/country-request-modal";
import { 
  Globe, 
  Clock, 
  Check, 
  X, 
  AlertCircle,
  Calendar,
  MessageSquare,
  Plus
} from "lucide-react";
import { useState } from "react";

export default function DriverCountryRequestsPage() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  const { data: requests, isLoading, isError, error } = useQuery({
    queryKey: ["my-country-requests"],
    queryFn: getMyCountryRequests,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isError) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-800">Error loading country requests</h3>
            <p className="text-sm text-red-600">{error?.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Country Requests
          </h1>
          <p className="text-muted-foreground">
            Request new countries to expand your route options
          </p>
        </div>
        
        <CountryRequestModal
          isOpen={showRequestModal}
          onOpenChange={setShowRequestModal}
          trigger={
            <Button className="bg-brand-orange hover:bg-brand-orange-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Request New Country
            </Button>
          }
          onRequestSubmitted={() => {
            // The query will be invalidated by the modal
          }}
        />
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works</p>
              <p>
                Can't find a country you need for your routes? Submit a request and our team will review it within 24-48 hours. 
                Once approved, the country will be available for route creation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Your Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
              <span className="ml-2 text-muted-foreground">Loading requests...</span>
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-1">No country requests yet</p>
              <p>Submit your first request to expand your route options</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {request.countryName} ({request.countryCode})
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pl-11">
                      <p className="text-sm text-muted-foreground italic">
                        "{request.reason}"
                      </p>
                      
                      {request.adminNotes && (
                        <div className="mt-2 p-3 rounded-lg bg-muted/50">
                          <p className="text-sm text-foreground">
                            <strong>Admin Notes:</strong> {request.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(request.status)}
                    {request.reviewedAt && (
                      <div className="text-xs text-muted-foreground">
                        Reviewed {new Date(request.reviewedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 