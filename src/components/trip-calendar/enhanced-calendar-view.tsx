import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  CalendarDays,
  Grid3X3,
  Repeat
} from "lucide-react";
import { type Trip } from "@/services/convex/trips";
import CalendarTile from "./droppable-calendar-tile";
import QuickScheduleModal from "./quick-schedule-modal";
import DaySummaryModal from "./day-summary-modal";

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
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [showQuickSchedule, setShowQuickSchedule] = useState(false);
  const [quickScheduleDate, setQuickScheduleDate] = useState<Date | null>(null);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [summaryDate, setSummaryDate] = useState<Date | null>(null);
  const [summaryTrips, setSummaryTrips] = useState<CalendarTrip[]>([]);

  // Get first day of current month
  const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  const lastDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);
  
  // Get first day of calendar (might be from previous month)
  const firstDayOfCalendar = useMemo(() => {
    const date = new Date(firstDayOfMonth);
    date.setDate(date.getDate() - firstDayOfMonth.getDay());
    return date;
  }, [firstDayOfMonth]);
  
  // Get last day of calendar (might be from next month)
  const lastDayOfCalendar = useMemo(() => {
    const date = new Date(lastDayOfMonth);
    date.setDate(date.getDate() + (6 - lastDayOfMonth.getDay()));
    return date;
  }, [lastDayOfMonth]);

  // Generate calendar days for month view
  const monthCalendarDays = useMemo(() => {
    const days = [];
    const current = new Date(firstDayOfCalendar);
    
    while (current <= lastDayOfCalendar) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [firstDayOfCalendar, lastDayOfCalendar]);

  // Generate calendar days for week view
  const weekCalendarDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    const current = new Date(startOfWeek);
    
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  const calendarDays = calendarView === 'month' ? monthCalendarDays : weekCalendarDays;

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

  const handlePrevious = () => {
    if (calendarView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const handleNext = () => {
    if (calendarView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const handleScheduleClick = (date: Date) => {
    setQuickScheduleDate(date);
    setShowQuickSchedule(true);
  };

  const handleDayClick = (date: Date, trips: CalendarTrip[]) => {
    setSummaryDate(date);
    setSummaryTrips(trips);
    setShowDaySummary(true);
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
          {/* Header Row 1: Title and View Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Interactive Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={calendarView} onValueChange={(value) => setCalendarView(value as 'month' | 'week')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="month" className="flex items-center gap-1">
                    <Grid3X3 className="w-3 h-3" />
                    <span className="hidden sm:inline">Month</span>
                  </TabsTrigger>
                  <TabsTrigger value="week" className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    <span className="hidden sm:inline">Week</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Header Row 2: Navigation and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[120px] sm:min-w-[140px] text-center">
                {calendarView === 'month' 
                  ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                  : `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                }
              </h3>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-brand-dark-blue hover:bg-brand-dark-blue-600 text-white" onClick={handleTodayClick}>
                Today
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => window.location.href = '/driver/trips/batch-schedule'}
              >
                <Repeat className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Batch</span>
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleScheduleClick(new Date())}
                className="bg-brand-orange hover:bg-brand-orange-600 text-white"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Schedule</span>
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
            <div className={`grid grid-cols-7 ${calendarView === 'month' ? 'min-h-[600px]' : 'min-h-[200px]'}`}>
              {calendarDays.map((date, index) => {
                const dateKey = date.toDateString();
                const dayTrips = tripsByDate[dateKey] || [];
                
                return (
                  <CalendarTile
                    key={index}
                    date={date}
                    trips={dayTrips}
                    onTripSelect={onTripSelect}
                    onScheduleClick={handleScheduleClick}
                    onDayClick={handleDayClick}
                    isCurrentMonth={calendarView === 'month' ? isCurrentMonth(date) : true}
                    isToday={isToday(date)}
                    isSelected={isSelected(date)}
                    isWeekView={calendarView === 'week'}
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
                💡 Click empty dates to schedule • Click trip counts for details
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

      {/* Day Summary Modal */}
      {showDaySummary && summaryDate && (
        <DaySummaryModal
          isOpen={showDaySummary}
          onClose={() => {
            setShowDaySummary(false);
            setSummaryDate(null);
            setSummaryTrips([]);
          }}
          selectedDate={summaryDate}
          trips={summaryTrips}
          onTripSelect={onTripSelect}
        />
      )}
    </>
  );
} 