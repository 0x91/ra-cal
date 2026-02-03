import type { RAEvent } from "../lib/ra-api";

interface EventListProps {
  events: RAEvent[];
  loading: boolean;
  browseMode?: boolean;
}

export function EventList({ events, loading, browseMode = false }: EventListProps) {
  if (loading) {
    return (
      <div className="text-zinc-400 text-center py-8">Loading events...</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-zinc-500 text-center py-8">
        {browseMode ? "Select a date above to see events" : "No events found. Select venues above."}
      </div>
    );
  }

  // Group events by date
  const eventsByDate = events.reduce(
    (acc, event) => {
      const date = event.date.split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    },
    {} as Record<string, RAEvent[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(eventsByDate).map(([date, dayEvents]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">
            {new Date(date).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <a
                key={event.id}
                href={`https://ra.co${event.contentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-medium truncate">{event.title}</h4>
                    <p className="text-sm text-zinc-400 truncate">
                      {event.venue?.name || "Venue TBA"}
                    </p>
                    {event.artists.length > 0 && (
                      <p className="text-sm text-zinc-500 truncate">
                        {event.artists
                          .slice(0, 5)
                          .map((a) => a.name)
                          .join(", ")}
                        {event.artists.length > 5 && ` +${event.artists.length - 5} more`}
                      </p>
                    )}
                  </div>
                  {event.startTime && (
                    <span className="text-sm text-zinc-500 flex-shrink-0">
                      {new Date(event.startTime).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
