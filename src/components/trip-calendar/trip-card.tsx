import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  MapPin, 
  Edit,
  Trash2,
  MoreHorizontal,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getStatusColor,
  deleteTrip,
  type Trip 
} from "@/services/convex/trips";
import { toast } from "sonner";

// Trip with enhanced date properties for calendar display
interface CalendarTrip extends Trip {
  date: Date;
  isMultiDay: boolean;
  startDate: Date;
  endDate: Date;
}

interface TripCardProps {
  trip: CalendarTrip;
  onTripSelect: (trip: CalendarTrip) => void;
  compact?: boolean;
}

export default function TripCard({ trip, onTripSelect, compact = false }: TripCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
      toast.success('Trip deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete trip: ${error.message}`);
    },
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      deleteMutation.mutate(trip.id);
    }
    setShowContextMenu(false);
  };

  const departureTime = new Date(trip.departureTime);
  const arrivalTime = new Date(trip.arrivalTime);
  
  // Use route template name instead of empty routeCities
  const routePath = trip.routeTemplateName || 'Unknown Route';

  return (
    <>
      <div
        className={`
          trip-event cursor-pointer rounded transition-all group
          ${compact ? 'p-1.5 border-l-2 bg-white/90 hover:bg-white shadow-sm hover:shadow' : 'p-3 mb-2 border-l-4 bg-white shadow-sm hover:shadow-md'}
        `}
        style={{ 
          borderLeftColor: trip.status === 'completed' ? '#10b981' : 
                           trip.status === 'in_progress' ? '#f59e0b' : 
                           trip.status === 'cancelled' ? '#ef4444' : '#3b82f6'
        }}
        onClick={() => onTripSelect(trip)}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-start justify-between mb-1 gap-2">
          <div className="flex items-start gap-1 flex-1 min-w-0">
            <h4 className={`font-semibold text-foreground truncate leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>
              {trip.routeTemplateName}
            </h4>
            {!compact && (
              <Badge className={getStatusColor(trip.status)} style={{ fontSize: '9px', lineHeight: '1' }}>
                {trip.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
          {compact && (
            <div className={`text-muted-foreground text-xs shrink-0 leading-tight`}>
              {departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        
        {compact && (
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(trip.status)} style={{ fontSize: '8px', lineHeight: '1', padding: '1px 4px' }}>
              {trip.status.replace('_', ' ')}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate text-xs">{routePath}</span>
            </div>
          </div>
        )}
        
        {!compact && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{routePath}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs min-w-0">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>→</span>
                <span>{arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e);
                }}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="fixed z-[9999] bg-white border border-border rounded-lg shadow-xl py-1 min-w-[150px]"
            style={{
              left: Math.min(contextMenuPosition.x, window.innerWidth - 160),
              top: Math.min(contextMenuPosition.y, window.innerHeight - 120),
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-3 text-xs"
              asChild
            >
              <Link to={`/driver/trips/${trip.id}`}>
                <Eye className="w-3 h-3 mr-2" />
                View Details
              </Link>
            </Button>
            {trip.status === 'scheduled' && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs"
                asChild
              >
                <Link to={`/driver/trips/${trip.id}/edit`}>
                  <Edit className="w-3 h-3 mr-2" />
                  Edit Trip
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-3 text-xs text-red-600 hover:text-red-700"
              onClick={handleDelete}
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete Trip
            </Button>
          </div>
        </>
      )}
    </>
  );
} 