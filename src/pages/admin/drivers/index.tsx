import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function DriversPage() {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <Button asChild>
          <Link to="/admin/drivers/new">Add Driver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Driver List</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Here will be a table of drivers.</p>
        </CardContent>
      </Card>
    </div>
  );
} 