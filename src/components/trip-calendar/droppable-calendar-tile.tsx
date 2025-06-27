import React from "react";
import { useDrop } from "react-dnd";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { type Trip } from "@/services/trips";
import DraggableTrip from "./draggable-trip";

// Trip with enhanced date properties for calendar display
interface CalendarTrip extends Trip {
  date: Date;
  isMultiDay: boolean;
  startDate: Date;
  endDate: Date;
}

interface DroppableCalendarTileProps {
  date: Date;
  trips: CalendarTrip[];
  onTripSelect: (trip: CalendarTrip) => void;
  onScheduleClick: (date: Date) => void;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

interface DragItem {
  trip: CalendarTrip;
}

export default function DroppableCalendarTile({
  date,
  trips,
  onTripSelect,
  onScheduleClick,
  isCurrentMonth,
  isToday,
  isSelected
}: DroppableCalendarTileProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'trip',
    drop: () => ({ date }),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const handleDateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trips.length === 0) {
      onScheduleClick(date);
    }
  };

  const dayNumber = date.getDate();
  const isDropTarget = isOver && canDrop;
  const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
  
  return (
    <div
      ref={drop}
      className={`
        calendar-tile relative min-h-[120px] p-2 border-r border-b border-border/30 cursor-pointer
        ${isCurrentMonth ? 'bg-white' : 'bg-muted/20'}
        ${isToday ? 'bg-blue-50 border-blue-200' : ''}
        ${isSelected ? 'bg-brand-orange/10 border-brand-orange' : ''}
        ${isDropTarget ? 'bg-green-50 border-green-300 border-2' : ''}
        ${!isCurrentMonth ? 'text-muted-foreground' : ''}
        hover:bg-muted/30 transition-colors overflow-hidden
      `}
      onClick={handleDateClick}
    >
      {/* Date Number */}
      <div className={`
        text-sm font-medium mb-2 leading-none
        ${isToday ? 'text-blue-600 font-bold' : ''}
        ${!isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'}
      `}>
        {dayNumber}
      </div>

      {/* Trips List */}
      <div className="space-y-1 flex-1 min-h-0">
        {trips.slice(0, 2).map((trip) => (
          <DraggableTrip
            key={trip.id}
            trip={trip}
            onTripSelect={onTripSelect}
            compact={true}
          />
        ))}
        
        {trips.length > 2 && (
          <div className="text-xs text-muted-foreground text-center py-1 bg-muted/50 rounded border">
            +{trips.length - 2} more
          </div>
        )}
      </div>

      {/* Add Trip Button (visible on hover for empty dates) */}
      {trips.length === 0 && isCurrentMonth && !isPastDate && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-brand-orange hover:bg-brand-orange/10 border border-border/30"
            onClick={handleDateClick}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Drop Indicator */}
      {isDropTarget && (
        <div className="absolute inset-0 border-2 border-dashed border-green-400 bg-green-50/50 rounded-md flex items-center justify-center">
          <div className="text-xs font-medium text-green-700">Drop here</div>
        </div>
      )}

      {/* Today Indicator */}
      {isToday && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </div>
  );
} 