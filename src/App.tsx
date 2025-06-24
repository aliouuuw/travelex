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

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 z-10">
      <nav className="h-14 flex items-center justify-between px-4 border-b">
        <Link to="/" className="font-bold text-lg text-primary">TravelEx</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
              <Button variant="default" size="sm" onClick={handleSignOut}>Logout</Button>
            </>
          ) : (
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">Login</Link>
          )}
        </div>
      </nav>
    </header>
  )
}

const Layout = ({ hasHeader }: { hasHeader: boolean }) => {
  return (
    <div className="relative flex min-h-screen flex-col">
      {hasHeader && <Header />}
      <main className="flex-1 pt-14">
        <Outlet />
      </main>
    </div>
  )
}

const Home = () => {
  return (
    <div className='flex flex-col justify-center items-center h-screen w-screen antialiased'>
      <h1 className='text-3xl font-bold'>Welcome to TravelEx</h1>
      <p className="text-muted-foreground">The best way to travel.</p>
    </div>
  )
}

const About = () => {
  return (
    <div className='flex flex-col justify-center items-center h-full w-full'>
      <h1 className='text-3xl font-bold'>About TravelEx</h1>
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
                path: "drivers",
                element: <DriversPage />,
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
