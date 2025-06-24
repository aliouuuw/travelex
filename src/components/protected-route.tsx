import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth-provider";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
    const { session, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/auth" replace />;
    }

    return <Outlet />;
} 