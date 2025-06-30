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
import DriverLayout from "./pages/driver/layout";
import DriverDashboard from "./pages/driver/dashboard";
import NewDriverPage from "./pages/admin/drivers/new";
import SignupRequestsPage from "./pages/admin/signup-requests";
import CountryRequestsPage from "./pages/admin/country-requests";

import DriverRoutesPage from "./pages/driver/routes";
import RouteEditor from "./pages/driver/routes/edit";
import LuggagePoliciesPage from "./pages/driver/luggage-policies";
import VehiclesPage from "./pages/driver/vehicles";
import NewVehiclePage from "./pages/driver/vehicles/new";
import EditVehiclePage from "./pages/driver/vehicles/edit";
import DriverTripsPage from "./pages/driver/trips";
import ScheduleTripPage from "./pages/driver/trips/schedule";
import EditTripPage from "./pages/driver/trips/edit";
import ReservationsPage from "./pages/driver/reservations";
import ReservationDetailPage from "./pages/driver/reservations/[id]";
import DriverCountryRequestsPage from "./pages/driver/country-requests";
import AccountSettings from "./pages/settings";
import SearchPage from "./pages/search";
import BookingPage from "./pages/book";
import PaymentPage from "./pages/payment";
import BookingSuccessPage from "./pages/booking-success";
import { LogOut, LayoutDashboard, ChevronDown, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

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

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isInDashboard = user && (user.profile?.role === 'admin' || user.profile?.role === 'driver');

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 z-50">
      <nav className="h-16 flex items-center justify-between px-6 mx-auto max-w-7xl">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/logo.png" alt="TravelEx" className="w-12 lg:w-18 xl:w-20 h-auto" />
        </Link>
        
        <div className="flex items-center gap-6">
          {!isInDashboard && (
            <>
              <Link 
                to="/search" 
                className="text-sm font-medium text-muted-foreground hover:text-brand-orange transition-colors"
              >
                Search Trips
              </Link>
              <Link 
                to="/about" 
                className="text-sm font-medium text-muted-foreground hover:text-brand-orange transition-colors"
              >
                About
              </Link>
            </>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-auto rounded-full px-3 py-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {user.profile?.avatar_url && (
                        <AvatarImage src={user.profile.avatar_url} alt={user.profile?.full_name || 'User'} />
                      )}
                      <AvatarFallback className="bg-brand-orange/10 text-brand-orange font-medium">
                        {getUserInitials(user.profile?.full_name || 'User')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground">
                        {user.profile?.full_name || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {user.profile?.role || 'user'}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(getDashboardPath())}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  {getDashboardLabel()}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <Link to="/search">Search Trips</Link>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="border-border/60 hover:border-brand-orange hover:text-brand-orange hover:bg-brand-orange-50 transition-all text-base px-8 py-3"
          >
            <Link to="/auth">Join as Driver</Link>
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
        path: "/search",
        element: <SearchPage />,
      },
      {
        path: "/book/:tripId",
        element: <BookingPage />,
      },
      {
        path: "/payment/:bookingId",
        element: <PaymentPage />,
      },
      {
        path: "/booking-success/:bookingId",
        element: <BookingSuccessPage />,
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
          {
            path: "/settings",
            element: <AccountSettings />,
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
                path: "country-requests",
                element: <CountryRequestsPage />,
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
            element: <DriverLayout />,
            path: "/driver",
            children: [
              {
                path: "dashboard",
                element: <DriverDashboard />,
              },
              {
                path: "routes",
                element: <DriverRoutesPage />,
              },
              {
                path: "routes/edit",
                element: <RouteEditor />,
              },
              {
                path: "routes/:id/edit", 
                element: <RouteEditor />,
              },
              {
                path: "country-requests",
                element: <DriverCountryRequestsPage />,
              },
              {
                path: "trips",
                element: <DriverTripsPage />,
              },
              {
                path: "trips/schedule",
                element: <ScheduleTripPage />,
              },
              {
                path: "trips/:id/edit",
                element: <EditTripPage />,
              },
              {
                path: "reservations",
                element: <ReservationsPage />,
              },
              {
                path: "reservations/:id",
                element: <ReservationDetailPage />,
              },
              {
                path: "luggage-policies",
                element: <LuggagePoliciesPage />,
              },
              {
                path: "vehicles",
                element: <VehiclesPage />,
              },
              {
                path: "vehicles/new",
                element: <NewVehiclePage />,
              },
              {
                path: "vehicles/edit/:id",
                element: <EditVehiclePage />,
              },
            ]
          }
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
