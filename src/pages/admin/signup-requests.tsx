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
import { Loader2, Check, X } from "lucide-react";
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
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{request.full_name}</TableCell>
      <TableCell>{request.email}</TableCell>
      <TableCell className="max-w-md">
        {request.message || <span className="text-muted-foreground">No message</span>}
      </TableCell>
      <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
      <TableCell>{getStatusBadge()}</TableCell>
      <TableCell>
        {request.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApprove}
              disabled={isUpdating}
              className="text-green-600 hover:text-green-700"
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
              className="text-red-600 hover:text-red-700"
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

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Driver Applications</h1>
          {pendingCount > 0 && (
            <p className="text-muted-foreground">
              {pendingCount} pending application{pendingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {isError && (
            <div className="text-red-500">Error: {error.message}</div>
          )}
          {requests && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <SignupRequestRow key={request.id} request={request} />
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No applications yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 