import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSignupRequests, updateSignupRequestStatus, type SignupRequest } from "@/services/signup-requests";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Check, X, UserCheck, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { supabase } from "@/services/supabase";

// Function to invite approved users
const inviteDriver = async (email: string, fullName: string) => {
  const { data, error } = await supabase.functions.invoke('invite-driver', {
    body: {
      email,
      full_name: fullName,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const SignupRequestRow = ({ request }: { request: SignupRequest }) => {
  const queryClient = useQueryClient();

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      updateSignupRequestStatus(id, status),
    onSuccess: async (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: ["signup-requests"] });
      
      if (updatedRequest.status === 'approved') {
        try {
          await inviteDriver(updatedRequest.email, updatedRequest.full_name);
          toast.success(`${updatedRequest.full_name} has been approved and invited!`);
        } catch (error) {
          toast.error('Request approved but failed to send invitation. Please send invitation manually.');
        }
      } else {
        toast.success(`Request from ${updatedRequest.full_name} has been rejected.`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to update request: ${error.message}`);
    },
  });

  const handleApprove = () => {
    updateStatus({ id: request.id, status: 'approved' });
  };

  const handleReject = () => {
    updateStatus({ id: request.id, status: 'rejected' });
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
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="font-medium">{request.full_name}</TableCell>
      <TableCell className="text-muted-foreground">{request.email}</TableCell>
      <TableCell className="max-w-md">
        {request.message ? (
          <div className="text-sm">
            <p className="line-clamp-2">{request.message}</p>
          </div>
        ) : (
          <span className="text-muted-foreground italic">No message</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(request.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell>{getStatusBadge()}</TableCell>
      <TableCell>
        {request.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApprove}
              disabled={isUpdating}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 hover:border-green-200 transition-all"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={isUpdating}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {request.status !== 'pending' && (
          <span className="text-muted-foreground text-sm">
            {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : ''}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
};

export default function SignupRequestsPage() {
  const { data: requests, isLoading, isError, error } = useQuery({
    queryKey: ["signup-requests"],
    queryFn: getSignupRequests,
  });

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;
  const approvedCount = requests?.filter(r => r.status === 'approved').length || 0;
  const rejectedCount = requests?.filter(r => r.status === 'rejected').length || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Driver Applications
        </h1>
        <p className="text-muted-foreground">
          Review and manage driver application requests
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
                <UserCheck className="w-5 h-5 text-green-600" />
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

      {/* Alert for pending applications */}
      {pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {pendingCount} application{pendingCount !== 1 ? 's' : ''} awaiting review
                </p>
                <p className="text-sm text-yellow-700">
                  Review and approve applications to invite new drivers to join TravelEx.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Applications Table */}
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-heading text-xl text-foreground">
            All Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex justify-center items-center p-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
                <span className="text-muted-foreground">Loading applications...</span>
              </div>
            </div>
          )}
          
          {isError && (
            <div className="p-12 text-center">
              <div className="text-destructive mb-2">Error loading applications</div>
              <div className="text-sm text-muted-foreground">{error.message}</div>
            </div>
          )}
          
          {requests && requests.length === 0 && (
            <div className="p-12 text-center">
              <UserCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                No applications yet
              </h3>
              <p className="text-muted-foreground">
                Driver applications will appear here when users apply to join your platform.
              </p>
            </div>
          )}
          
          {requests && requests.length > 0 && (
            <div className="border-t border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="font-semibold text-foreground">Full Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Message</TableHead>
                    <TableHead className="font-semibold text-foreground">Applied</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <SignupRequestRow key={request.id} request={request} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 