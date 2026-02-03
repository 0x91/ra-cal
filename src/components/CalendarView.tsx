import { useState, useMemo } from "preact/hooks";
import { cn } from "../lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-preact";
import type { RAEvent } from "../lib/ra-api";

export interface DateRange {
  start: string;
  end: string | null;
}

interface CalendarViewProps {
  events: RAEvent[];
  onDateRangeSelect: (range: DateRange | null) => void;
  selectedRange: DateRange | null;
  browseMode?: boolean;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function CalendarView({ events, onDateRangeSelect, selectedRange, browseMode = false }: CalendarViewProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, RAEvent[]>();
    events.forEach((event) => {
      const dateKey = event.date.split("T")[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const daysInMonth = useMemo(
    () => getDaysInMonth(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  );

  const firstDayOfWeek = daysInMonth[0]?.getDay() || 0;
  const today = formatDateKey(new Date());

  const goToPrevMonth = () => {
    setViewMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setViewMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDateClick = (dateKey: string) => {
    if (!selectedRange) {
      // First click - start new range
      onDateRangeSelect({ start: dateKey, end: null });
    } else if (!selectedRange.end) {
      // Second click - complete range
      if (dateKey < selectedRange.start) {
        // Clicked before start - make this the new start
        onDateRangeSelect({ start: dateKey, end: selectedRange.start });
      } else if (dateKey === selectedRange.start) {
        // Clicked same day - single day selection
        onDateRangeSelect({ start: dateKey, end: dateKey });
      } else {
        // Clicked after start - set end
        onDateRangeSelect({ start: selectedRange.start, end: dateKey });
      }
    } else {
      // Already have a range - start new selection
      if (dateKey === selectedRange.start && dateKey === selectedRange.end) {
        // Clicking the single selected day - clear
        onDateRangeSelect(null);
      } else {
        // Start new range
        onDateRangeSelect({ start: dateKey, end: null });
      }
    }
  };

  const isInRange = (dateKey: string): boolean => {
    if (!selectedRange) return false;
    if (!selectedRange.end) return dateKey === selectedRange.start;
    return dateKey >= selectedRange.start && dateKey <= selectedRange.end;
  };

  const isRangeStart = (dateKey: string): boolean => {
    return selectedRange?.start === dateKey;
  };

  const isRangeEnd = (dateKey: string): boolean => {
    return selectedRange?.end === dateKey;
  };

  const monthName = new Date(viewMonth.year, viewMonth.month).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button
          onClick={goToPrevMonth}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <span className="font-medium">{monthName}</span>
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-zinc-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square border-b border-r border-zinc-800/50" />
        ))}

        {daysInMonth.map((date) => {
          const dateKey = formatDateKey(date);
          const dayEvents = eventsByDate.get(dateKey) || [];
          const hasEvents = dayEvents.length > 0;
          const isToday = dateKey === today;
          const isPast = dateKey < today;
          const isClickable = browseMode ? !isPast : hasEvents;
          const inRange = isInRange(dateKey);
          const isStart = isRangeStart(dateKey);
          const isEnd = isRangeEnd(dateKey);

          return (
            <button
              key={dateKey}
              onClick={() => {
                if (isClickable) {
                  handleDateClick(dateKey);
                }
              }}
              className={cn(
                "aspect-square border-b border-r border-zinc-800/50 flex flex-col items-center justify-center relative transition-colors",
                isClickable && "cursor-pointer hover:bg-zinc-800/50",
                !isClickable && "text-zinc-600 cursor-default",
                inRange && "bg-zinc-800",
                isStart && "rounded-l-lg",
                isEnd && "rounded-r-lg"
              )}
            >
              <span
                className={cn(
                  "text-sm",
                  isToday && "font-bold text-white",
                  inRange && "text-white",
                  browseMode && !isPast && !inRange && "text-zinc-300"
                )}
              >
                {date.getDate()}
              </span>

              {!browseMode && hasEvents && (
                <div className="flex gap-0.5 mt-1">
                  {dayEvents.length <= 3 ? (
                    dayEvents.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          inRange ? "bg-white" : "bg-zinc-400"
                        )}
                      />
                    ))
                  ) : (
                    <span
                      className={cn(
                        "text-xs",
                        inRange ? "text-white" : "text-zinc-400"
                      )}
                    >
                      {dayEvents.length}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
