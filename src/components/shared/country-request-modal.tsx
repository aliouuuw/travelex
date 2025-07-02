import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Globe,
  Plus,
  Send,
  Clock,
  Info
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { submitCountryRequest } from "@/services/supabase/countries";

interface CountryRequestModalProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  suggestedCountry?: string;
  suggestedCode?: string;
  onRequestSubmitted?: () => void;
}

// Service is now imported from @/services/countries

export const CountryRequestModal = ({
  trigger,
  isOpen,
  onOpenChange,
  suggestedCountry = "",
  suggestedCode = "",
  onRequestSubmitted
}: CountryRequestModalProps) => {
  const [formData, setFormData] = useState({
    countryName: suggestedCountry,
    countryCode: suggestedCode.toUpperCase(),
    reason: ""
  });

  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: submitCountryRequest,
    onSuccess: () => {
      toast.success("Country request submitted! We'll review it shortly.");
      setFormData({ countryName: "", countryCode: "", reason: "" });
      onOpenChange?.(false);
      onRequestSubmitted?.();
      // Invalidate any relevant queries
      queryClient.invalidateQueries({ queryKey: ['country-requests'] });
    },
    onError: () => {
      toast.error("Failed to submit country request. Please try again.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.countryName || !formData.countryCode || !formData.reason) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (formData.countryCode.length !== 2) {
      toast.error("Country code must be exactly 2 characters");
      return;
    }

    requestMutation.mutate(formData);
  };

  const defaultTrigger = (
    <Button variant="outline" className="w-full border-dashed border-2">
      <Plus className="w-4 h-4 mr-2" />
      Request New Country
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Request New Country
          </DialogTitle>
          <DialogDescription>
            Can't find your country? Request it and we'll review your submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Review Process</p>
                  <p>Country requests are reviewed by our team within 24-48 hours. You'll be notified once approved.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="countryName">Country Name *</Label>
              <Input
                id="countryName"
                value={formData.countryName}
                onChange={(e) => setFormData(prev => ({ ...prev, countryName: e.target.value }))}
                placeholder="e.g., Morocco"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="countryCode">Country Code (ISO 3166-1) *</Label>
              <Input
                id="countryCode"
                value={formData.countryCode}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  countryCode: e.target.value.toUpperCase().slice(0, 2)
                }))}
                placeholder="e.g., MA"
                maxLength={2}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                2-letter code (e.g., MA for Morocco, NG for Nigeria)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Why do you need this country? *</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., I want to create routes between Casablanca and Rabat"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Help us understand your use case for faster approval
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="submit" 
                disabled={requestMutation.isPending}
                className="flex-1 bg-brand-dark-blue text-white hover:bg-brand-dark-blue/80"
              >
                {requestMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange?.(false)}
                disabled={requestMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Convenience component for quick access
export const QuickCountryRequest = ({ 
  className = "" 
}: { 
  className?: string 
}) => {
  return (
    <div className={className}>
      <CountryRequestModal 
        trigger={
          <Card className="border-dashed border-2 border-orange-300 hover:border-orange-400 transition-colors cursor-pointer">
            <CardContent className="p-4 text-center">
              <Globe className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <h3 className="font-medium text-orange-800">Country Not Listed?</h3>
              <p className="text-sm text-orange-600 mb-3">Request a new country</p>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                <Clock className="w-3 h-3 mr-1" />
                24-48h review
              </Badge>
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}; 