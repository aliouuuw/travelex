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
import { Loader2, Mail, Plus, Users } from "lucide-react";
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
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="font-medium">{driver.full_name}</TableCell>
      <TableCell className="text-muted-foreground">{driver.email}</TableCell>
      <TableCell className="text-muted-foreground">{createdAt}</TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Driver
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetPassword}
          disabled={isSendingReset}
          className="flex items-center gap-2 hover:bg-brand-orange/10 hover:border-brand-orange hover:text-brand-orange transition-all"
        >
          {isSendingReset ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          <span>Reset Password</span>
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Drivers
          </h1>
          <p className="text-muted-foreground">
            Manage your network of professional drivers
          </p>
        </div>
        <Button 
          asChild 
          className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all"
        >
          <Link to="/admin/drivers/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Driver
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
                <p className="text-2xl font-bold text-foreground">
                  {drivers?.length || 0}
                </p>
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
                <p className="text-sm text-muted-foreground">Active Drivers</p>
                <p className="text-2xl font-bold text-foreground">
                  {drivers?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                <Users className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New This Month</p>
                <p className="text-2xl font-bold text-foreground">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers Table */}
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-heading text-xl text-foreground">
            All Drivers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex justify-center items-center p-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
                <span className="text-muted-foreground">Loading drivers...</span>
              </div>
            </div>
          )}
          
          {isError && (
            <div className="p-12 text-center">
              <div className="text-destructive mb-2">Error loading drivers</div>
              <div className="text-sm text-muted-foreground">{error.message}</div>
            </div>
          )}
          
          {drivers && drivers.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                No drivers yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start building your driver network by adding your first driver.
              </p>
              <Button asChild className="bg-brand-orange hover:bg-brand-orange-600 text-white">
                <Link to="/admin/drivers/new">Add First Driver</Link>
              </Button>
            </div>
          )}
          
          {drivers && drivers.length > 0 && (
            <div className="border-t border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="font-semibold text-foreground">Full Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Joined</TableHead>
                    <TableHead className="font-semibold text-foreground">Role</TableHead>
                    <TableHead className="font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <DriverRow key={driver.id} driver={driver} />
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