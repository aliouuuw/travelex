import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCountryRequests, approveCountryRequest, rejectCountryRequest, type CountryRequest } from "@/services/supabase/countries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Loader2, 
  Check, 
  X, 
  Globe, 
  Clock, 
  AlertCircle,
  MapPin,
  User,
  Calendar,
  MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CountryRequestRow = ({ request }: { request: CountryRequest }) => {
  const queryClient = useQueryClient();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [flagEmoji, setFlagEmoji] = useState("");

  const { mutate: approveRequest, isPending: isApproving } = useMutation({
    mutationFn: ({ id, flagEmoji }: { id: string; flagEmoji?: string }) =>
      approveCountryRequest(id, flagEmoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["country-requests"] });
      setShowApproveDialog(false);
      setFlagEmoji("");
      toast.success(`${request.countryName} has been approved and added to the system!`);
    },
    onError: (error) => {
      toast.error(`Failed to approve request: ${error.message}`);
    },
  });

  const { mutate: rejectRequest, isPending: isRejecting } = useMutation({
    mutationFn: (id: string) => rejectCountryRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["country-requests"] });
      toast.success(`Request for ${request.countryName} has been rejected.`);
    },
    onError: (error) => {
      toast.error(`Failed to reject request: ${error.message}`);
    },
  });

  const handleApprove = () => {
    setShowApproveDialog(true);
  };

  const handleReject = () => {
    rejectRequest(request.id);
  };

  const handleConfirmApprove = () => {
    approveRequest({ id: request.id, flagEmoji: flagEmoji || undefined });
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
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
    }
  };

  return (
    <>
      <TableRow className="hover:bg-muted/30 transition-colors">
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
              <Globe className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium">{request.countryName}</div>
              <div className="text-sm text-muted-foreground">{request.countryCode}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{request.requesterName}</div>
              <div className="text-sm text-muted-foreground">{request.requesterEmail}</div>
            </div>
          </div>
        </TableCell>
        <TableCell className="max-w-md">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="line-clamp-2">{request.reason}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              {new Date(request.createdAt).toLocaleDateString()}
            </span>
          </div>
        </TableCell>
        <TableCell>{getStatusBadge()}</TableCell>
        <TableCell>
          {request.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 hover:border-green-200 transition-all"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={isApproving || isRejecting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-all"
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          {request.status !== 'pending' && (
            <div className="text-muted-foreground text-sm">
              {request.reviewedAt ? (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(request.reviewedAt).toLocaleDateString()}
                </div>
              ) : null}
              {request.reviewerName && (
                <div className="flex items-center gap-1 mt-1">
                  <User className="w-3 h-3" />
                  {request.reviewerName}
                </div>
              )}
            </div>
          )}
        </TableCell>
      </TableRow>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Country Request</DialogTitle>
            <DialogDescription>
              You're about to approve the request for {request.countryName} ({request.countryCode}). 
              This will add the country to the system and make it available for route creation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flag-emoji">Flag Emoji (Optional)</Label>
              <Input
                id="flag-emoji"
                placeholder="🇺🇸"
                value={flagEmoji}
                onChange={(e) => setFlagEmoji(e.target.value)}
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Add a flag emoji for better visual representation
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmApprove}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Approve & Add Country
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function CountryRequestsPage() {
  const { data: requests, isLoading, isError, error } = useQuery({
    queryKey: ["country-requests"],
    queryFn: () => getCountryRequests(),
  });

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;
  const approvedCount = requests?.filter(r => r.status === 'approved').length || 0;
  const rejectedCount = requests?.filter(r => r.status === 'rejected').length || 0;

  if (isError) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Country Requests
        </h1>
        <p className="text-muted-foreground">
          Review and manage requests for adding new countries to the platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Country Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading requests...</span>
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>No country requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Business Justification</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <CountryRequestRow key={request.id} request={request} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 