import { useState, useEffect, useMemo } from "preact/hooks";
import { AreaSelector, POPULAR_AREAS } from "./components/AreaSelector";
import { VenueSelector } from "./components/VenueSelector";
import { EventList } from "./components/EventList";
import { CalendarView, type DateRange as CalendarDateRange } from "./components/CalendarView";
import { Button } from "./components/Button";
import {
  DateRangeSelector,
  getDateRangeFromPreset,
  type DateRangePreset,
  type DateRange,
} from "./components/DateRangeSelector";
import { getEventsForVenues, getEventsForArea, type RAEvent } from "./lib/ra-api";
import { downloadICal } from "./lib/ical";
import { Calendar, Download, Link, X, Info } from "lucide-preact";
import { SubscribeModal } from "./components/SubscribeModal";
import { AboutModal } from "./components/AboutModal";

export function App() {
  const [areaId, setAreaId] = useState<string>("13"); // Default to London
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [allVenues, setAllVenues] = useState(false);
  const [events, setEvents] = useState<RAEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Calendar date range selection/filter
  const [selectedCalendarRange, setSelectedCalendarRange] = useState<CalendarDateRange | null>(null);

  // Date range state
  const [datePreset, setDatePreset] = useState<DateRangePreset>("month");
  const [customDateRange, setCustomDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return { start: today, end: nextMonth };
  });

  // Fetch events when selection changes
  useEffect(() => {
    // For "All Venues" mode, wait for calendar date selection
    if (allVenues) {
      if (!selectedCalendarRange?.end) {
        setEvents([]);
        return;
      }
      const dayStart = new Date(selectedCalendarRange.start);
      const dayEnd = new Date(selectedCalendarRange.end);
      dayEnd.setDate(dayEnd.getDate() + 1);

      setLoading(true);
      getEventsForArea(areaId, dayStart.toISOString(), dayEnd.toISOString())
        .then(setEvents)
        .catch(() => setEvents([]))
        .finally(() => setLoading(false));
      return;
    }

    // Normal venue mode
    if (selectedVenues.length === 0) {
      setEvents([]);
      return;
    }

    const { start, end } = getDateRangeFromPreset(datePreset, customDateRange);

    setLoading(true);
    getEventsForVenues(selectedVenues, start.toISOString(), end.toISOString())
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [selectedVenues, allVenues, areaId, datePreset, customDateRange, selectedCalendarRange]);

  // Filter events when a calendar date range is selected
  const displayedEvents = useMemo(() => {
    if (!selectedCalendarRange?.end) return events;
    const { start, end } = selectedCalendarRange;
    return events.filter((e) => {
      const eventDate = e.date.split("T")[0];
      return eventDate >= start && eventDate <= end!;
    });
  }, [events, selectedCalendarRange]);

  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const handleExport = () => {
    if (events.length === 0) return;
    downloadICal(events, "ra-events.ics", "RA Events");
  };

  const getSubscriptionUrl = () => {
    const base = window.location.origin;
    const params = new URLSearchParams({
      range: datePreset === "custom" ? "month" : datePreset,
    });
    if (allVenues) {
      params.set("area", areaId);
    } else {
      params.set("venues", selectedVenues.join(","));
    }
    return `${base}/api/calendar?${params}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-zinc-400" />
              <h1 className="font-semibold">RA → Cal</h1>
            </div>
            <button
              onClick={() => setShowAboutModal(true)}
              className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors"
              title="About"
            >
              <Info className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
          {events.length > 0 && (
            <Button onClick={handleExport} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export {events.length} events
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <section className="space-y-4">
          <AreaSelector selectedArea={areaId} onAreaChange={setAreaId} />
        </section>

        <section className="space-y-4">
          <DateRangeSelector
            preset={datePreset}
            customRange={customDateRange}
            onPresetChange={setDatePreset}
            onCustomRangeChange={setCustomDateRange}
          />
        </section>

        {areaId && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Select Venues</h2>
            <VenueSelector
              areaId={areaId}
              areaName={POPULAR_AREAS.find((a) => a.id === areaId)?.name}
              selectedVenues={selectedVenues}
              onSelectionChange={setSelectedVenues}
              allVenues={allVenues}
              onAllVenuesChange={setAllVenues}
            />
          </section>
        )}

        {(selectedVenues.length > 0 || allVenues || loading) && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium">
              Upcoming Events
              {events.length > 0 && (
                <span className="text-zinc-400 font-normal"> ({events.length})</span>
              )}
            </h2>

            {/* Calendar - always show when we have events or in browse mode */}
            {(allVenues || events.length > 0) && (
              <CalendarView
                events={events}
                selectedRange={selectedCalendarRange}
                onDateRangeSelect={setSelectedCalendarRange}
                browseMode={allVenues}
              />
            )}

            {/* Date filter indicator */}
            {selectedCalendarRange?.end && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Showing:</span>
                <button
                  onClick={() => setSelectedCalendarRange(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full text-sm hover:bg-zinc-700 transition-colors"
                >
                  {selectedCalendarRange.start === selectedCalendarRange.end ? (
                    new Date(selectedCalendarRange.start).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  ) : (
                    <>
                      {new Date(selectedCalendarRange.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {" → "}
                      {new Date(selectedCalendarRange.end!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </>
                  )}
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
            )}

            <EventList events={displayedEvents} loading={loading} browseMode={allVenues && !selectedCalendarRange?.end} />
          </section>
        )}

        {events.length > 0 && (
          <div className="sticky bottom-6 pb-safe flex justify-center gap-3">
            <Button onClick={handleExport} size="lg" className="shadow-xl bg-zinc-100 text-zinc-900">
              <Download className="w-5 h-5 mr-2" />
              Download
            </Button>
            <Button onClick={() => setShowSubscribeModal(true)} size="lg" className="shadow-xl bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
              <Link className="w-5 h-5 mr-2" />
              Subscribe
            </Button>
          </div>
        )}

        {showSubscribeModal && (
          <SubscribeModal
            url={getSubscriptionUrl()}
            onClose={() => setShowSubscribeModal(false)}
          />
        )}

        {showAboutModal && (
          <AboutModal onClose={() => setShowAboutModal(false)} />
        )}
      </main>
    </div>
  );
}
