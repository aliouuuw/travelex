"use client";
 
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React, { forwardRef } from "react";
 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
 
const FormSchema = z.object({
  time: z.date({
    required_error: "A date and time is required.",
  }),
});

// Reusable DateTime Picker Field Component
interface DateTimePickerFieldProps {
  value?: Date | string;
  onChange?: (date: Date) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export const DateTimePickerField = forwardRef<HTMLButtonElement, DateTimePickerFieldProps>(
  ({ value, onChange, placeholder = "Select date and time", className, disabled, minDate, maxDate }, ref) => {
    const [open, setOpen] = React.useState(false);
    
    // Convert string to Date if needed
    const dateValue = React.useMemo(() => {
      if (!value) return undefined;
      if (typeof value === 'string') {
        return new Date(value);
      }
      return value;
    }, [value]);

    const handleDateSelect = (date: Date | undefined) => {
      if (date && onChange) {
        let newDate: Date;
        
        // If there's already a time set, preserve it
        if (dateValue) {
          newDate = new Date(date);
          newDate.setHours(dateValue.getHours());
          newDate.setMinutes(dateValue.getMinutes());
        } else {
          // Set default time to 8 AM
          newDate = new Date(date);
          newDate.setHours(8, 0, 0, 0);
        }
        
        // Check if the resulting time violates the minimum constraint
        if (minDate && newDate < minDate) {
          // If we're on the same date as minDate, adjust time to be after minDate
          const isSameDate = newDate.toDateString() === minDate.toDateString();
          if (isSameDate) {
            // Set time to 30 minutes after the minimum time
            newDate = new Date(minDate);
            newDate.setMinutes(newDate.getMinutes() + 30);
          }
        }
        
        onChange(newDate);
      }
    };

    const handleTimeChange = (type: "hour" | "minute" | "ampm", timeValue: string) => {
      const currentDate = dateValue || new Date();
      const newDate = new Date(currentDate);

      if (type === "hour") {
        const hour = parseInt(timeValue, 10);
        const currentHours = newDate.getHours();
        const isPM = currentHours >= 12;
        newDate.setHours(isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour));
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(timeValue, 10));
      } else if (type === "ampm") {
        const hours = newDate.getHours();
        if (timeValue === "AM" && hours >= 12) {
          newDate.setHours(hours - 12);
        } else if (timeValue === "PM" && hours < 12) {
          newDate.setHours(hours + 12);
        }
      }

      // Check if the new time violates the minimum date constraint
      if (minDate && newDate < minDate) {
        return; // Don't update if the new time is before the minimum
      }

      if (onChange) {
        onChange(newDate);
      }
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal transition-colors",
              !dateValue && "text-muted-foreground",
              dateValue && "border-brand-orange/50 hover:border-brand-orange focus:border-brand-orange focus:ring-brand-orange",
              className
            )}
            disabled={disabled}
          >
            {dateValue ? (
              format(dateValue, "MM/dd/yyyy hh:mm aa")
            ) : (
              <span>{placeholder}</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white border shadow-lg z-[9999]" align="start">
          <div className="sm:flex bg-white">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleDateSelect}
              disabled={(date) => {
                // Only compare dates, not times, for calendar day selection
                if (minDate) {
                  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                  if (dateOnly < minDateOnly) return true;
                }
                if (maxDate) {
                  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
                  if (dateOnly > maxDateOnly) return true;
                }
                return false;
              }}
              initialFocus
              className="[&_.rdp-day_selected]:bg-brand-orange [&_.rdp-day_selected]:text-white [&_.rdp-day_selected]:hover:bg-brand-orange-600 [&_.rdp-day]:hover:bg-brand-orange/10 [&_.rdp-day]:hover:text-brand-orange [&_.rdp-button]:hover:bg-brand-orange/10 [&_.rdp-nav_button]:hover:bg-brand-orange/10 [&_.rdp-nav_button]:hover:text-brand-orange [&_.rdp-day_today]:bg-brand-orange/20 [&_.rdp-day_today]:text-brand-orange [&_.rdp-day_today]:font-semibold"
            />
            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x divide-brand-orange/20 bg-white">
              <ScrollArea className="w-64 sm:w-auto bg-white">
                <div className="flex sm:flex-col p-2 bg-white">
                  {Array.from({ length: 12 }, (_, i) => i + 1)
                    .reverse()
                    .map((hour) => {
                      const isHourDisabled = () => {
                        if (!minDate || !dateValue) return false;
                        
                        // Check if we're on the same date as minDate
                        const isSameDate = dateValue.toDateString() === minDate.toDateString();
                        if (!isSameDate) return false;
                        
                        // Calculate what the hour would be
                        const currentHours = dateValue.getHours();
                        const isPM = currentHours >= 12;
                        const newHour = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
                        
                        // Create a test date with this hour
                        const testDate = new Date(dateValue);
                        testDate.setHours(newHour);
                        
                        return testDate < minDate;
                      };

                      return (
                        <Button
                          key={hour}
                          size="icon"
                          variant={
                            dateValue &&
                            (dateValue.getHours() % 12 === hour % 12 || 
                             (hour === 12 && dateValue.getHours() % 12 === 0))
                              ? "default"
                              : "ghost"
                          }
                          className={`sm:w-full shrink-0 aspect-square transition-colors ${
                            dateValue &&
                            (dateValue.getHours() % 12 === hour % 12 || 
                             (hour === 12 && dateValue.getHours() % 12 === 0))
                              ? "bg-brand-orange hover:bg-brand-orange-600 text-white"
                              : "hover:bg-brand-orange/10 hover:text-brand-orange"
                          }`}
                          disabled={isHourDisabled()}
                          onClick={() =>
                            handleTimeChange("hour", hour.toString())
                          }
                        >
                          {hour}
                        </Button>
                      );
                    })}
                </div>
                <ScrollBar
                  orientation="horizontal"
                  className="sm:hidden"
                />
              </ScrollArea>
              <ScrollArea className="w-64 sm:w-auto bg-white">
                <div className="flex sm:flex-col p-2 bg-white">
                  {Array.from({ length: 12 }, (_, i) => i * 5).map(
                    (minute) => {
                      const isMinuteDisabled = () => {
                        if (!minDate || !dateValue) return false;
                        
                        // Check if we're on the same date as minDate
                        const isSameDate = dateValue.toDateString() === minDate.toDateString();
                        if (!isSameDate) return false;
                        
                        // Create a test date with this minute
                        const testDate = new Date(dateValue);
                        testDate.setMinutes(minute);
                        
                        return testDate < minDate;
                      };

                      return (
                        <Button
                          key={minute}
                          size="icon"
                          variant={
                            dateValue &&
                            dateValue.getMinutes() === minute
                              ? "default"
                              : "ghost"
                          }
                          className={`sm:w-full shrink-0 aspect-square transition-colors ${
                            dateValue &&
                            dateValue.getMinutes() === minute
                              ? "bg-brand-orange hover:bg-brand-orange-600 text-white"
                              : "hover:bg-brand-orange/10 hover:text-brand-orange"
                          }`}
                          disabled={isMinuteDisabled()}
                          onClick={() =>
                            handleTimeChange("minute", minute.toString())
                          }
                        >
                          {minute.toString().padStart(2, "0")}
                        </Button>
                      );
                    }
                  )}
                </div>
                <ScrollBar
                  orientation="horizontal"
                  className="sm:hidden"
                />
              </ScrollArea>
              <ScrollArea className="bg-white">
                <div className="flex sm:flex-col p-2 bg-white">
                  {["AM", "PM"].map((ampm) => {
                    const isAmPmDisabled = () => {
                      if (!minDate || !dateValue) return false;
                      
                      // Check if we're on the same date as minDate
                      const isSameDate = dateValue.toDateString() === minDate.toDateString();
                      if (!isSameDate) return false;
                      
                      // Create a test date with the AM/PM change
                      const testDate = new Date(dateValue);
                      const hours = testDate.getHours();
                      
                      if (ampm === "AM" && hours >= 12) {
                        testDate.setHours(hours - 12);
                      } else if (ampm === "PM" && hours < 12) {
                        testDate.setHours(hours + 12);
                      }
                      
                      return testDate < minDate;
                    };

                    return (
                      <Button
                        key={ampm}
                        size="icon"
                        variant={
                          dateValue &&
                          ((ampm === "AM" &&
                            dateValue.getHours() < 12) ||
                            (ampm === "PM" &&
                              dateValue.getHours() >= 12))
                            ? "default"
                            : "ghost"
                        }
                        className={`sm:w-full shrink-0 aspect-square transition-colors ${
                          dateValue &&
                          ((ampm === "AM" &&
                            dateValue.getHours() < 12) ||
                            (ampm === "PM" &&
                              dateValue.getHours() >= 12))
                            ? "bg-brand-orange hover:bg-brand-orange-600 text-white"
                            : "hover:bg-brand-orange/10 hover:text-brand-orange"
                        }`}
                        disabled={isAmPmDisabled()}
                        onClick={() => handleTimeChange("ampm", ampm)}
                      >
                        {ampm}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

DateTimePickerField.displayName = "DateTimePickerField";
 
export function DateTimePickerForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
 
  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast.success(`Selected date and time: ${format(data.time, "PPPPpppp")}`);
  }
 
  function handleDateSelect(date: Date | undefined) {
    if (date) {
      form.setValue("time", date);
    }
  }
 
  function handleTimeChange(type: "hour" | "minute" | "ampm", value: string) {
    const currentDate = form.getValues("time") || new Date();
    const newDate = new Date(currentDate);
 
    if (type === "hour") {
      const hour = parseInt(value, 10);
      newDate.setHours(newDate.getHours() >= 12 ? hour + 12 : hour);
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(value, 10));
    } else if (type === "ampm") {
      const hours = newDate.getHours();
      if (value === "AM" && hours >= 12) {
        newDate.setHours(hours - 12);
      } else if (value === "PM" && hours < 12) {
        newDate.setHours(hours + 12);
      }
    }
 
    form.setValue("time", newDate);
  }
 
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Enter your date & time (12h)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal transition-colors",
                        !field.value && "text-muted-foreground",
                        field.value && "border-brand-orange/50 hover:border-brand-orange focus:border-brand-orange focus:ring-brand-orange"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "MM/dd/yyyy hh:mm aa")
                      ) : (
                        <span>MM/DD/YYYY hh:mm aa</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border shadow-lg z-[9999]">
                  <div className="sm:flex bg-white">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={handleDateSelect}
                      initialFocus
                      className="[&_.rdp-day_selected]:bg-brand-orange [&_.rdp-day_selected]:text-white [&_.rdp-day_selected]:hover:bg-brand-orange-600 [&_.rdp-day]:hover:bg-brand-orange/10 [&_.rdp-day]:hover:text-brand-orange [&_.rdp-button]:hover:bg-brand-orange/10 [&_.rdp-nav_button]:hover:bg-brand-orange/10 [&_.rdp-nav_button]:hover:text-brand-orange [&_.rdp-day_today]:bg-brand-orange/20 [&_.rdp-day_today]:text-brand-orange [&_.rdp-day_today]:font-semibold"
                    />
                    <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x divide-brand-orange/20 bg-white">
                      <ScrollArea className="w-64 sm:w-auto bg-white">
                        <div className="flex sm:flex-col p-2 bg-white">
                          {Array.from({ length: 12 }, (_, i) => i + 1)
                            .reverse()
                            .map((hour) => (
                              <Button
                                key={hour}
                                size="icon"
                                variant={
                                  field.value &&
                                  field.value.getHours() % 12 === hour % 12
                                    ? "default"
                                    : "ghost"
                                }
                                className={`sm:w-full shrink-0 aspect-square transition-colors ${
                                  field.value &&
                                  field.value.getHours() % 12 === hour % 12
                                    ? "bg-brand-orange hover:bg-brand-orange-600 text-white"
                                    : "hover:bg-brand-orange/10 hover:text-brand-orange"
                                }`}
                                onClick={() =>
                                  handleTimeChange("hour", hour.toString())
                                }
                              >
                                {hour}
                              </Button>
                            ))}
                        </div>
                        <ScrollBar
                          orientation="horizontal"
                          className="sm:hidden"
                        />
                      </ScrollArea>
                      <ScrollArea className="w-64 sm:w-auto bg-white">
                        <div className="flex sm:flex-col p-2 bg-white">
                          {Array.from({ length: 12 }, (_, i) => i * 5).map(
                            (minute) => (
                              <Button
                                key={minute}
                                size="icon"
                                variant={
                                  field.value &&
                                  field.value.getMinutes() === minute
                                    ? "default"
                                    : "ghost"
                                }
                                className={`sm:w-full shrink-0 aspect-square transition-colors ${
                                  field.value &&
                                  field.value.getMinutes() === minute
                                    ? "bg-brand-orange hover:bg-brand-orange-600 text-white"
                                    : "hover:bg-brand-orange/10 hover:text-brand-orange"
                                }`}
                                onClick={() =>
                                  handleTimeChange("minute", minute.toString())
                                }
                              >
                                {minute.toString().padStart(2, "0")}
                              </Button>
                            )
                          )}
                        </div>
                        <ScrollBar
                          orientation="horizontal"
                          className="sm:hidden"
                        />
                      </ScrollArea>
                      <ScrollArea className="bg-white">
                        <div className="flex sm:flex-col p-2 bg-white">
                          {["AM", "PM"].map((ampm) => (
                                                          <Button
                                key={ampm}
                                size="icon"
                                variant={
                                  field.value &&
                                  ((ampm === "AM" &&
                                    field.value.getHours() < 12) ||
                                    (ampm === "PM" &&
                                      field.value.getHours() >= 12))
                                    ? "default"
                                    : "ghost"
                                }
                                className={`sm:w-full shrink-0 aspect-square transition-colors ${
                                  field.value &&
                                  ((ampm === "AM" &&
                                    field.value.getHours() < 12) ||
                                    (ampm === "PM" &&
                                      field.value.getHours() >= 12))
                                    ? "bg-brand-orange hover:bg-brand-orange-600 text-white"
                                    : "hover:bg-brand-orange/10 hover:text-brand-orange"
                                }`}
                                onClick={() => handleTimeChange("ampm", ampm)}
                              >
                              {ampm}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Please select your preferred date and time.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}