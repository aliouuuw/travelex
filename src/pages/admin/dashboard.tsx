import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  UserCheck, 
  Activity, 
  MapPin,
  DollarSign
} from "lucide-react";

const StatCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  gradient = false 
}: { 
  title: string; 
  value: string; 
  change?: string; 
  icon: React.ElementType; 
  gradient?: boolean;
}) => (
      <Card className={`premium-card hover:shadow-premium-hover transition-all ${gradient ? 'bg-brand-orange text-white' : ''}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className={`text-sm font-medium ${gradient ? 'text-white/90' : 'text-muted-foreground'}`}>
        {title}
      </CardTitle>
      <Icon className={`h-4 w-4 ${gradient ? 'text-white/80' : 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold mb-1 ${gradient ? 'text-white' : 'text-foreground'}`}>
        {value}
      </div>
      {change && (
        <p className={`text-xs ${gradient ? 'text-white/80' : 'text-muted-foreground'}`}>
          {change}
        </p>
      )}
    </CardContent>
  </Card>
);

const QuickActionCard = ({ 
  title, 
  description, 
  icon: Icon, 
}: { 
  title: string; 
  description: string; 
  icon: React.ElementType; 
  href: string;
}) => (
  <Card className="premium-card hover:shadow-premium-hover transition-all cursor-pointer group">
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-orange/10 group-hover:bg-brand-orange/20 transition-colors">
          <Icon className="w-6 h-6 text-brand-orange" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Admin Dashboard
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome to your TravelEx management center
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Drivers"
          value="12"
          change="+2 since last month"
          icon={Users}
        />
        <StatCard
          title="Pending Applications"
          value="3"
          change="Review required"
          icon={UserCheck}
        />
        <StatCard
          title="Active Routes"
          value="8"
          change="+1 this week"
          icon={MapPin}
        />
        <StatCard
          title="Total Revenue"
          value="$4,250"
          change="+15% from last month"
          icon={DollarSign}
          gradient={true}
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Review Applications"
            description="3 pending driver applications waiting for review"
            icon={UserCheck}
            href="/admin/signup-requests"
          />
          <QuickActionCard
            title="Manage Drivers"
            description="View and manage your driver network"
            icon={Users}
            href="/admin/drivers"
          />
          <QuickActionCard
            title="Add New Driver"
            description="Invite a new driver to join TravelEx"
            icon={Activity}
            href="/admin/drivers/new"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Recent Activity
        </h2>
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-border/40">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    New driver application approved
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sofia Davis was approved and invited • 2 hours ago
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 pb-4 border-b border-border/40">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Driver password updated
                  </p>
                  <p className="text-xs text-muted-foreground">
                    John Smith completed account setup • 5 hours ago
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
                  <Activity className="w-5 h-5 text-brand-orange" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    New application received
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Michael Johnson applied to become a driver • 1 day ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 