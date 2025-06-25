import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updateUserPassword } from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Car, Calendar, DollarSign, Users, Settings, Lock, Gauge } from "lucide-react";

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  gradient = false,
  color = "blue"
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType; 
  gradient?: boolean;
  color?: string;
}) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-brand-orange",
    purple: "bg-purple-100 text-purple-600"
  };

  return (
    <Card className={`premium-card hover:shadow-premium-hover transition-all ${gradient ? 'bg-brand-dark-blue text-white' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${gradient ? 'bg-white/20' : colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className={`w-6 h-6 ${gradient ? 'text-white' : ''}`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${gradient ? 'text-white/80' : 'text-muted-foreground'}`}>
              {title}
            </p>
            <p className={`text-2xl font-bold ${gradient ? 'text-white' : 'text-foreground'}`}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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
        <Card className="premium-card">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-orange/10">
                        <Lock className="w-5 h-5 text-brand-orange" />
                    </div>
                    <div>
                        <CardTitle className="font-heading text-lg text-foreground">Update Password</CardTitle>
                        <p className="text-sm text-muted-foreground">Change your account password</p>
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
                            className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                        />
                        {form.formState.errors.password && (
                            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                        )}
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isPending}
                        className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all"
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
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Welcome back, {user?.profile?.full_name?.split(' ')[0] || 'Driver'}! 👋
        </h1>
        <p className="text-lg text-muted-foreground">
          Here's what's happening with your TravelEx business today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Earnings"
          value="$1,250"
          icon={DollarSign}
          gradient={true}
        />
        <StatCard
          title="Upcoming Rides"
          value="3"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Completed Rides"
          value="12"
          icon={Car}
          color="green"
        />
        <StatCard
          title="Rating"
          value="4.9"
          icon={Gauge}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="premium-card hover:shadow-premium-hover transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
                    Manage Schedule
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    View and update your upcoming trips
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card hover:shadow-premium-hover transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors">
                  <Car className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
                    Vehicle Settings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your vehicle information
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card hover:shadow-premium-hover transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
                    Earnings Report
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Track your income and analytics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity & Settings */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Recent Activity
          </h2>
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border/40">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                    <Car className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Trip completed successfully
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Casablanca → Rabat • $85 earned • 2 hours ago
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pb-4 border-b border-border/40">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      New booking confirmed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tomorrow 9:00 AM • Rabat → Fès • 1 day ago
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
                    <Users className="w-5 h-5 text-brand-orange" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Customer review received
                    </p>
                    <p className="text-xs text-muted-foreground">
                      5 stars • "Great driver!" • 2 days ago
                    </p>
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
          
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">Profile Settings</h3>
                  <p className="text-sm text-muted-foreground">Update your personal information</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full hover:bg-muted/50 transition-colors"
                disabled
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 