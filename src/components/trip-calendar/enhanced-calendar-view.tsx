import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus
} from "lucide-react";
import { type Trip } from "@/services/trips";
import DroppableCalendarTile from "./droppable-calendar-tile";
import QuickScheduleModal from "./quick-schedule-modal";

// Trip with enhanced date properties for calendar display
interface CalendarTrip extends Trip {
  date: Date;
  isMultiDay: boolean;
  startDate: Date;
  endDate: Date;
}

interface EnhancedCalendarViewProps {
  trips: CalendarTrip[];
  onTripSelect: (trip: CalendarTrip) => void;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function EnhancedCalendarView({
  trips,
  onTripSelect,
  selectedDate,
  onDateSelect
}: EnhancedCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showQuickSchedule, setShowQuickSchedule] = useState(false);
  const [quickScheduleDate, setQuickScheduleDate] = useState<Date | null>(null);

  // Get first day of current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Get first day of calendar (might be from previous month)
  const firstDayOfCalendar = new Date(firstDayOfMonth);
  firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - firstDayOfMonth.getDay());
  
  // Get last day of calendar (might be from next month)
  const lastDayOfCalendar = new Date(lastDayOfMonth);
  lastDayOfCalendar.setDate(lastDayOfCalendar.getDate() + (6 - lastDayOfMonth.getDay()));

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    const current = new Date(firstDayOfCalendar);
    
    while (current <= lastDayOfCalendar) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [firstDayOfCalendar, lastDayOfCalendar]);

  // Group trips by date
  const tripsByDate = useMemo(() => {
    const grouped: Record<string, CalendarTrip[]> = {};
    
    trips.forEach(trip => {
      const dateKey = trip.startDate.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(trip);
    });
    
    return grouped;
  }, [trips]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleScheduleClick = (date: Date) => {
    setQuickScheduleDate(date);
    setShowQuickSchedule(true);
  };

  const handleTodayClick = () => {
    const today = new Date();
    setCurrentDate(today);
    onDateSelect(today);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && 
           date.getFullYear() === currentDate.getFullYear();
  };

  const isSelected = (date: Date) => {
    return selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
  };

  return (
    <>
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Interactive Calendar
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-lg font-semibold min-w-[140px] text-center">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleTodayClick}>
                Today
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleScheduleClick(new Date())}
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Schedule
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Calendar Grid */}
          <div className="border border-border rounded-lg overflow-hidden bg-white">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {WEEKDAYS.map((day) => (
                <div 
                  key={day} 
                  className="p-3 text-center text-sm font-semibold text-muted-foreground border-r last:border-r-0 border-border"
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 min-h-[600px]">
              {calendarDays.map((date, index) => {
                const dateKey = date.toDateString();
                const dayTrips = tripsByDate[dateKey] || [];
                
                return (
                  <DroppableCalendarTile
                    key={index}
                    date={date}
                    trips={dayTrips}
                    onTripSelect={onTripSelect}
                    onScheduleClick={handleScheduleClick}
                    isCurrentMonth={isCurrentMonth(date)}
                    isToday={isToday(date)}
                    isSelected={isSelected(date)}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Calendar Legend */}
          <div className="p-4 border-t border-border bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-l-4 border-blue-500 bg-white rounded-sm"></div>
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-l-4 border-yellow-500 bg-white rounded-sm"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-l-4 border-green-500 bg-white rounded-sm"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-l-4 border-red-500 bg-white rounded-sm"></div>
                  <span>Cancelled</span>
                </div>
              </div>
              <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                💡 Click empty dates to schedule • Drag trips to reschedule • Right-click for options
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Schedule Modal */}
      {showQuickSchedule && quickScheduleDate && (
        <QuickScheduleModal
          isOpen={showQuickSchedule}
          onClose={() => {
            setShowQuickSchedule(false);
            setQuickScheduleDate(null);
          }}
          selectedDate={quickScheduleDate}
        />
      )}
    </>
  );
} 