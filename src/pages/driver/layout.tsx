import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigation = [
    {
        name: "Dashboard",
        href: "/driver/dashboard",
    },
    {
        name: "Reservations",
        href: "/driver/reservations",
    },
    {
        name: "Trips",
        href: "/driver/trips",
    },
    {
        name: "Routes",
        href: "/driver/routes",
    },
    {
        name: "Vehicles",
        href: "/driver/vehicles",
    },
    {
        name: "Luggage",
        href: "/driver/luggage-policies",
    },
    {
        name: "Analytics",
        href: "/driver/analytics",
        disabled: true
    },
];

const DriverTabNavigation = () => {
    const location = useLocation();    
    return (
        <div className="bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 border-b border-border/40 sticky top-16 z-40">

            {/* Tab Navigation */}
            <nav className="max-w-7xl mx-auto px-6">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href || 
                            (item.href !== "/driver/dashboard" && location.pathname.startsWith(item.href));
                        
                        if (item.disabled) {
                            return (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-2 px-6 py-3 text-muted-foreground/50 cursor-not-allowed whitespace-nowrap rounded-lg"
                                >
                                    <span className="font-medium text-sm">{item.name}</span>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-muted-foreground">
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
                                    "relative px-6 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-lg",
                                    isActive
                                        ? "bg-brand-dark-blue/5 text-brand-dark-blue font-semibold"
                                        : "text-muted-foreground hover:text-foreground hover:bg-brand-dark-blue/5"
                                )}
                            >
                                {item.name}
                                {isActive && (
                                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-brand-dark-blue rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default function DriverLayout() {
    return (
        <div className="min-h-screen bg-gray-50/30">
            <DriverTabNavigation />
            <main className="max-w-7xl mx-auto px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
} 