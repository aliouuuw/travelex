import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  X,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Users,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";
import { getStatusColor, type Trip } from "@/services/trips";
import TripCard from "./trip-card";

interface CalendarTrip extends Trip {
  date: Date;
  isMultiDay: boolean;
  startDate: Date;
  endDate: Date;
}

interface DaySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  trips: CalendarTrip[];
  onTripSelect: (trip: CalendarTrip) => void;
}

export default function DaySummaryModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  trips, 
  onTripSelect 
}: DaySummaryModalProps) {
  if (!isOpen) return null;

  const sortedTrips = trips.sort((a, b) => 
    new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  );

  const totalEarnings = trips.reduce((sum, trip) => sum + (trip.totalEarnings || 0), 0);
  const totalSeats = trips.reduce((sum, trip) => sum + trip.totalSeats, 0);
  const availableSeats = trips.reduce((sum, trip) => sum + trip.availableSeats, 0);
  const occupiedSeats = totalSeats - availableSeats;

  const statusCounts = trips.reduce((counts, trip) => {
    counts[trip.status] = (counts[trip.status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 bg-white">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-orange">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {trips.length} trip{trips.length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                asChild
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                <Link to="/driver/trips/schedule" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Trip
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Day Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Trips</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{trips.length}</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Passengers</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{occupiedSeats}/{totalSeats}</p>
            </div>
            
            {totalEarnings > 0 && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Earnings</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">₵{totalEarnings}</p>
              </div>
            )}
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Status</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <Badge 
                    key={status} 
                    className={getStatusColor(status as "scheduled" | "in_progress" | "completed" | "cancelled")}
                    style={{ fontSize: '10px' }}
                  >
                    {count} {status.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Trip Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold font-heading mb-4">Trip Schedule</h3>
            {sortedTrips.length > 0 ? (
              <div className="space-y-3">
                {sortedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onTripSelect={onTripSelect}
                    compact={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No trips scheduled for this date</p>
                <Button size="sm" asChild className="bg-brand-orange hover:bg-brand-orange-600 text-white">
                  <Link to="/driver/trips/schedule">
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Trip
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 