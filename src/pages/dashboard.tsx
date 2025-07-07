import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
    const navigate = useNavigate();
    const { profile } = useQuery(api.users.getCurrentUser) || {};

    useEffect(() => {
        if (profile) {
            navigate(profile.role === "admin" ? "/admin/dashboard" : "/driver/dashboard");
        }
    }, [navigate, profile]);

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your TravelEx dashboard.</p>
        </div>
    );
} 