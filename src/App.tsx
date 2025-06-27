import {
  createBrowserRouter,
  Link,
  RouterProvider,
  Outlet,
  useNavigate,
} from "react-router-dom";
import Auth from "./pages/auth";
import { Toaster, toast } from "sonner";
import Dashboard from "./pages/dashboard";
import { ProtectedRoute } from "./components/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./components/ui/button";
import { AdminRoute } from "./components/admin-route";
import AdminLayout from "./pages/admin/layout";
import AdminDashboard from "./pages/admin/dashboard";
import DriversPage from "./pages/admin/drivers";
import { DriverRoute } from "./components/driver-route";
import DriverDashboard from "./pages/driver/dashboard";
import NewDriverPage from "./pages/admin/drivers/new";
import SignupRequestsPage from "./pages/admin/signup-requests";

import DriverRoutesPage from "./pages/driver/routes";
import RouteEditor from "./pages/driver/routes/edit";
import LuggagePoliciesPage from "./pages/driver/luggage-policies";
import VehiclesPage from "./pages/driver/vehicles";
import NewVehiclePage from "./pages/driver/vehicles/new";
import EditVehiclePage from "./pages/driver/vehicles/edit";
import DriverTripsPage from "./pages/driver/trips";
import ScheduleTripPage from "./pages/driver/trips/schedule";
import EditTripPage from "./pages/driver/trips/edit";
import TripCalendarPage from "./pages/driver/trips/calendar";
import { User, LogOut } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully!");
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const getDashboardPath = () => {
    if (!user || !user.profile) return "/dashboard";
    switch (user.profile.role) {
      case "admin":
        return "/admin/dashboard";
      case "driver":
        return "/driver/dashboard";
      default:
        return "/dashboard";
    }
  };

  const getDashboardLabel = () => {
    if (!user || !user.profile) return "Dashboard";
    switch (user.profile.role) {
      case "admin":
        return "Admin Dashboard";
      case "driver":
        return "Driver Dashboard";
      default:
        return "Dashboard";
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 z-50 border-b border-border/40 shadow-sm">
      <nav className="h-16 flex items-center justify-between px-6 mx-auto max-w-7xl">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/logo.png" alt="TravelEx" className="w-12 lg:w-18 xl:w-20 h-auto" />
        </Link>
        
        <div className="flex items-center gap-6">
          <Link 
            to="/about" 
            className="text-sm font-medium text-muted-foreground hover:text-brand-orange transition-colors"
          >
            About
          </Link>
          
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {user.profile?.full_name || 'User'}
                  </span>
                </div>
                
                <Link 
                  to={getDashboardPath()} 
                  className="text-sm font-medium text-muted-foreground hover:text-brand-orange transition-colors"
                >
                  {getDashboardLabel()}
                </Link>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center gap-2 border-border/60 hover:border-brand-orange hover:text-brand-orange transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link 
                to="/auth" 
                className="text-sm font-medium text-muted-foreground hover:text-brand-orange transition-colors"
              >
                Login
              </Link>
              <Button 
                asChild 
                size="sm"
                className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all"
              >
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}

const Layout = ({ hasHeader }: { hasHeader: boolean }) => {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {hasHeader && <Header />}
      <main className={`flex-1 ${hasHeader ? 'pt-16' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}

const Home = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-background">
      <div className="text-center space-y-6 max-w-4xl mx-auto px-6 animate-fade-in">
        <div className="space-y-4">
          <h1 className="font-heading text-5xl md:text-6xl font-bold text-brand-dark-blue">
            Welcome to TravelEx
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            The premium platform connecting passengers with drivers for comfortable inter-city travel
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <Button 
            asChild 
            size="lg" 
            className="bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all text-base px-8 py-3"
          >
            <Link to="/auth">Join as Driver</Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="border-border/60 hover:border-brand-orange hover:text-brand-orange hover:bg-brand-orange-50 transition-all text-base px-8 py-3"
          >
            <Link to="/about">Learn More</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

const About = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-background px-6">
      <div className="text-center space-y-6 max-w-4xl mx-auto animate-fade-in">
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-brand-dark-blue">
          About TravelEx
        </h1>
        <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
          <p>
            TravelEx is a premium ride-sharing platform designed specifically for inter-city travel. 
            We connect passengers with professional drivers for safe, comfortable, and reliable journeys.
          </p>
          <p>
            Our platform provides drivers with powerful management tools while ensuring passengers 
            enjoy a seamless booking experience with transparent pricing and quality assurance.
          </p>
        </div>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout hasHeader={true} />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/auth",
        element: <Auth />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/dashboard",
            element: <Dashboard />,
          },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            path: "/admin",
            children: [
              {
                path: "dashboard",
                element: <AdminDashboard />,
              },
              {
                path: "signup-requests",
                element: <SignupRequestsPage />,
              },
              {
                path: "drivers",
                element: <DriversPage />,
              },
              {
                path: "drivers/new",
                element: <NewDriverPage />,
              },

            ]
          }
        ]
      },
      {
        element: <DriverRoute />,
        children: [
          {
            path: "/driver/dashboard",
            element: <DriverDashboard />,
          },
          {
            path: "/driver/routes",
            element: <DriverRoutesPage />,
          },
          {
            path: "/driver/routes/edit",
            element: <RouteEditor />,
          },
          {
            path: "/driver/routes/:id/edit", 
            element: <RouteEditor />,
          },
          {
            path: "/driver/trips",
            element: <DriverTripsPage />,
          },
          {
            path: "/driver/trips/schedule",
            element: <ScheduleTripPage />,
          },
          {
            path: "/driver/trips/:id/edit",
            element: <EditTripPage />,
          },
          {
            path: "/driver/trips/calendar",
            element: <TripCalendarPage />,
          },
          {
            path: "/driver/luggage-policies",
            element: <LuggagePoliciesPage />,
          },
          {
            path: "/driver/vehicles",
            element: <VehiclesPage />,
          },
          {
            path: "/driver/vehicles/new",
            element: <NewVehiclePage />,
          },
          {
            path: "/driver/vehicles/edit/:id",
            element: <EditVehiclePage />,
          },
        ],
      }
    ]
  },
]);

function App() {
  return (
    <div>
      <RouterProvider router={router} />
      <Toaster />
    </div>
  )
}

export default App
