import { cn } from "../lib/utils";

export type DateRangePreset = "week" | "2weeks" | "month" | "3months" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeSelectorProps {
  preset: DateRangePreset;
  customRange: DateRange;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (range: DateRange) => void;
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "2weeks", label: "2 weeks" },
  { value: "month", label: "This month" },
  { value: "3months", label: "3 months" },
  { value: "custom", label: "Custom" },
];

export function getDateRangeFromPreset(preset: DateRangePreset, customRange: DateRange): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === "custom") {
    return customRange;
  }

  const start = new Date(today);
  const end = new Date(today);

  switch (preset) {
    case "week":
      // End of this week (Sunday)
      end.setDate(today.getDate() + (7 - today.getDay()));
      break;
    case "2weeks":
      end.setDate(today.getDate() + 14);
      break;
    case "month":
      end.setMonth(today.getMonth() + 1);
      break;
    case "3months":
      end.setMonth(today.getMonth() + 3);
      break;
  }

  return { start, end };
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function DateRangeSelector({
  preset,
  customRange,
  onPresetChange,
  onCustomRangeChange,
}: DateRangeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-zinc-400">Date Range</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-colors",
              preset === p.value
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "bg-zinc-900 border-zinc-700 hover:border-zinc-500"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-500">From</label>
            <input
              type="date"
              value={formatDateForInput(customRange.start)}
              onChange={(e) => {
                const newStart = new Date((e.target as HTMLInputElement).value);
                onCustomRangeChange({ ...customRange, start: newStart });
              }}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-500">To</label>
            <input
              type="date"
              value={formatDateForInput(customRange.end)}
              onChange={(e) => {
                const newEnd = new Date((e.target as HTMLInputElement).value);
                onCustomRangeChange({ ...customRange, end: newEnd });
              }}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
