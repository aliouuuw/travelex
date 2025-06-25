import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDrivers, type Driver } from "@/services/users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resetPassword } from "@/services/auth";
import { toast } from "sonner";

const DriverRow = ({ driver }: { driver: Driver }) => {
  const createdAt = driver.created_at
    ? new Date(driver.created_at).toLocaleDateString()
    : "Unknown";

  const { mutate: sendResetPassword, isPending: isSendingReset } = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success(`Password reset email sent to ${driver.email}`);
    },
    onError: (error) => {
      toast.error(`Failed to send reset email: ${error.message}`);
    },
  });

  const handleResetPassword = () => {
    sendResetPassword(driver.email);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{driver.full_name}</TableCell>
      <TableCell>{driver.email}</TableCell>
      <TableCell>{createdAt}</TableCell>
      <TableCell>
        <Badge variant="secondary">Driver</Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetPassword}
          disabled={isSendingReset}
        >
          {isSendingReset ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          <span className="ml-2">Reset Password</span>
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default function DriversPage() {
  const { data: drivers, isLoading, isError, error } = useQuery({
    queryKey: ["drivers"],
    queryFn: getDrivers,
  });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Button asChild>
          <Link to="/admin/drivers/new">Add Driver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Driver List</CardTitle>
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
          {drivers && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <DriverRow key={driver.id} driver={driver} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 