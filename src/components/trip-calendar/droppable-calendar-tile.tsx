import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { type Trip } from "@/services/supabase/trips";

// Trip with enhanced date properties for calendar display
interface CalendarTrip extends Trip {
  date: Date;
  isMultiDay: boolean;
  startDate: Date;
  endDate: Date;
}

interface CalendarTileProps {
  date: Date;
  trips: CalendarTrip[];
  onTripSelect: (trip: CalendarTrip) => void;
  onScheduleClick: (date: Date) => void;
  onDayClick?: (date: Date, trips: CalendarTrip[]) => void;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isWeekView?: boolean;
}

export default function CalendarTile({
  date,
  trips,
  onScheduleClick,
  onDayClick,
  isCurrentMonth,
  isToday,
  isSelected,
  isWeekView = false
}: CalendarTileProps) {

  const handleDateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trips.length === 0) {
      // Only allow scheduling for future dates and current month
      if (!isPastDate && isCurrentMonth) {
        onScheduleClick(date);
      }
    } else if (trips.length >= 1 && onDayClick) {
      // Always show day summary for any day with trips (past or future)
      onDayClick(date, trips);
    }
  };

  const dayNumber = date.getDate();
  const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));
  
  return (
    <div
      className={`
        calendar-tile relative ${isWeekView ? 'min-h-[150px]' : 'min-h-[120px]'} p-2 border-r border-b border-border/30 transition-colors overflow-hidden
        ${!isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : 
          isPastDate ? 'bg-gray-50 text-gray-400 cursor-not-allowed' :
          isToday ? 'bg-blue-50 border-blue-200 cursor-pointer' :
          'bg-white cursor-pointer hover:bg-brand-orange/5'}
        ${isSelected ? 'bg-brand-orange/10 border-brand-orange' : ''}
        ${!isPastDate && isCurrentMonth ? 'hover:bg-muted/30' : ''}
      `}
      onClick={handleDateClick}
    >
      {/* Date Number */}
      <div className={`
        text-sm font-medium mb-2 leading-none
        ${!isCurrentMonth ? 'text-muted-foreground' : 
          isPastDate ? 'text-gray-400' :
          isToday ? 'text-blue-600 font-bold' :
          'text-foreground'}
      `}>
        {dayNumber}
      </div>

      {/* Trips Summary - Simplified */}
      <div className="space-y-1 flex-1 min-h-0">
        {trips.length > 0 && (
          <div 
            className={`p-2 rounded text-center cursor-pointer transition-colors ${
              isPastDate 
                ? 'bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-150' 
                : 'bg-brand-orange/10 border border-brand-orange/30 hover:bg-brand-orange/20'
            }`}
            onClick={handleDateClick}
          >
            {/* Simple count display */}
            <div className={`text-xs font-bold ${isPastDate ? 'text-gray-500' : 'text-brand-orange'}`}>
              {trips.length}
            </div>
            <div className={`text-[10px] leading-tight ${isPastDate ? 'text-gray-400' : 'text-brand-orange/80'}`}>
              {trips.length === 1 ? 'trip' : 'trips'}
            </div>
            
            {/* Status dot */}
            <div className="flex justify-center mt-1">
              {trips.some(trip => trip.status === 'in_progress') ? (
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
              ) : trips.some(trip => trip.status === 'scheduled') ? (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              ) : trips.some(trip => trip.status === 'completed') ? (
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              ) : (
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Trip Button (visible on hover for empty future dates) */}
      {trips.length === 0 && isCurrentMonth && !isPastDate && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-brand-orange hover:bg-brand-orange/10 border border-brand-orange/30"
            onClick={handleDateClick}
            title="Schedule new trip"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Available for Scheduling Indicator */}
      {trips.length === 0 && isCurrentMonth && !isPastDate && !isToday && (
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-green-400 rounded-full opacity-50" title="Available for scheduling"></div>
      )}

      {/* Date Type Indicators */}
      {isToday && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" title="Today"></div>
      )}
      
      {/* Past Date Indicator */}
      {isPastDate && isCurrentMonth && trips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs text-gray-400 font-medium opacity-60">Past</div>
        </div>
      )}
    </div>
  );
} 