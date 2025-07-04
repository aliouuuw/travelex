import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DriverRoute() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!user) {
        toast.error("You must be logged in to access this page.");
        return <Navigate to="/auth" replace />;
    }

    if (user.profile?.role !== "driver") {
        console.error("Driver access denied:", {
            currentRole: user.profile?.role,
            expectedRole: "driver",
            redirectingTo: "/dashboard"
        });
        toast.error(`Access denied. Current role: ${user.profile?.role || 'none'}`);
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
} 