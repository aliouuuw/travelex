import { Link, Outlet, useLocation } from "react-router-dom";
import { 
    LayoutDashboard, 
    Users, 
    UserCheck, 
    Car, 
    Route, 
    MapPin,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    {
        name: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
    },
    {
        name: "Driver Applications",
        href: "/admin/signup-requests",
        icon: UserCheck,
    },
    {
        name: "Drivers",
        href: "/admin/drivers",
        icon: Users,
    },
    {
        name: "Passengers",
        href: "/admin/passengers",
        icon: Users,
        disabled: true,
    },
    {
        name: "Routes",
        href: "/admin/routes",
        icon: Route,
        disabled: true,
    },
    {
        name: "Stations",
        href: "/admin/stations",
        icon: MapPin,
        disabled: true,
    },
    {
        name: "Rides",
        href: "/admin/rides",
        icon: Car,
        disabled: true,
    },
];

const AdminSidebar = () => {
    const location = useLocation();
    
    return (
        <aside className="w-72 bg-white border-r border-border/40 flex flex-col shadow-sm">

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                <div className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;
                        
                        if (item.disabled) {
                            return (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground/50 rounded-lg cursor-not-allowed"
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.name}</span>
                                    <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                        Soon
                                    </span>
                                </div>
                            );
                        }
                        
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                    isActive
                                        ? "bg-brand-orange text-white shadow-brand"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border/40">
                <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </div>
            </div>
        </aside>
    );
};

export default function AdminLayout() {
    return (
        <div className="flex h-full bg-background">
            <AdminSidebar />
            <div className="flex-1 overflow-hidden">
                <main className="h-full overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
} 