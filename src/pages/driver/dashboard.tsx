import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updateUserPassword } from "@/services/supabase/auth";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { 
  Loader2, 
  Car, 
  Calendar, 
  Lock, 
  TrendingUp,
  Clock,
  MapPin,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";



const UpdatePasswordForm = () => {
    const form = useForm({
        defaultValues: {
            password: "",
        },
    });

    const { mutate: updatePassword, isPending } = useMutation({
        mutationFn: updateUserPassword,
        onSuccess: () => {
            toast.success("Password updated successfully!");
            form.reset();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const onSubmit = (data: { password: string; }) => {
        updatePassword(data.password);
    }

    return (
        <Card className="bg-white">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50">
                        <Lock className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                        <CardTitle className="font-heading text-lg text-foreground">Update Password</CardTitle>
                        <p className="text-sm text-muted-foreground">Secure your account</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                        <Input 
                            {...form.register("password")} 
                            id="password" 
                            type="password" 
                            placeholder="Enter your new password"
                            autoComplete="new-password"
                            className="h-11"
                        />
                        {form.formState.errors.password && (
                            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                        )}
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isPending}
                        className="bg-brand-orange hover:bg-brand-orange-600 text-white"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

export default function DriverDashboard() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Welcome back, {user?.profile?.fullName?.split(' ')[0] || 'Driver'}!
          </h1>
          <p className="text-muted-foreground">
            Here's your driver dashboard overview and recent activity
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white rounded-lg border border-border/40 p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">$1,250</div>
            <div className="text-sm text-muted-foreground mt-1">Monthly Earnings</div>
            <div className="text-xs text-foreground mt-1 font-medium">+12%</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">8</div>
            <div className="text-sm text-muted-foreground mt-1">This Week's Rides</div>
            <div className="text-xs text-foreground mt-1 font-medium">+3</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">3</div>
            <div className="text-sm text-muted-foreground mt-1">Upcoming Trips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">4.9★</div>
            <div className="text-sm text-muted-foreground mt-1">Average Rating</div>
            <div className="text-xs text-foreground mt-1 font-medium">+0.1</div>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Earnings Chart */}
        <Card className="lg:col-span-2 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-xl">Earnings Overview</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Your income trend over time</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                Last 7 days
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Earnings Chart</p>
                <p className="text-sm">Coming Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-border/30">
                <div>
                  <p className="font-medium text-sm">Casablanca → Rabat</p>
                  <p className="text-xs text-muted-foreground">9:00 AM</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">Confirmed</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/30">
                <div>
                  <p className="font-medium text-sm">Rabat → Fès</p>
                  <p className="text-xs text-muted-foreground">2:30 PM</p>
                </div>
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded font-medium">Pending</span>
              </div>
              <Link 
                to="/driver/trips" 
                className="block w-full text-center text-sm text-brand-orange hover:text-brand-orange-600 font-medium pt-3"
              >
                View All Trips →
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                Popular Routes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Casablanca → Rabat</span>
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">85% filled</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Rabat → Fès</span>
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">92% filled</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm">Fès → Meknes</span>
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">78% filled</span>
              </div>
              <Link 
                to="/driver/routes" 
                className="block w-full text-center text-sm text-brand-orange hover:text-brand-orange-600 font-medium pt-3"
              >
                Manage Routes →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity & Account Settings */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Recent Activity
          </h2>
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border/40">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50">
                    <Car className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Trip completed successfully
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Casablanca → Rabat • 2 hours ago
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">+$85</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pb-4 border-b border-border/40">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      New booking confirmed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tomorrow 9:00 AM • Rabat → Fès • 1 day ago
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">New</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50">
                    <Star className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Customer review received
                    </p>
                    <p className="text-xs text-muted-foreground">
                      5 stars • "Great driver, very professional!" • 2 days ago
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-gray-400 fill-gray-400" />
                      <span className="text-sm font-medium">5.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Settings */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Account Settings
          </h2>
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
} 