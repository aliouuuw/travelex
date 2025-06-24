import { Link, Outlet } from "react-router-dom";

const AdminSidebar = () => {
    return (
        <aside className="w-64 bg-background border-r p-4 flex-shrink-0">
            <h2 className="text-xl font-bold mb-4">Admin Menu</h2>
            <nav className="flex flex-col gap-2">
                <Link to="/admin/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
                <Link to="/admin/drivers" className="text-muted-foreground hover:text-foreground">Drivers</Link>
                <Link to="/admin/passengers" className="text-muted-foreground hover:text-foreground">Passengers</Link>
                <Link to="/admin/rides" className="text-muted-foreground hover:text-foreground">Rides</Link>
            </nav>
        </aside>
    );
};


export default function AdminLayout() {
  return (
    <div className="flex h-full">
        <AdminSidebar />
        <div className="flex-1 overflow-y-auto">
            <Outlet />
        </div>
    </div>
  );
} 