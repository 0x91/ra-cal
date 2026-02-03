// Subscription calendar endpoint - returns ICS for given venues

interface RAEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  contentUrl: string;
  artists: Array<{ id: string; name: string }>;
  venue: {
    id: string;
    name: string;
    address?: string;
    location?: { latitude: number; longitude: number };
  } | null;
}

const GET_EVENTS_LISTING = `
query GET_EVENTS_LISTING($filters: [FilterInput], $pageSize: Int, $page: Int) {
  listing(
    indices: [EVENT]
    filters: $filters
    pageSize: $pageSize
    page: $page
    sortField: DATE
    sortOrder: ASCENDING
  ) {
    data {
      ... on Event {
        id
        title
        date
        startTime
        endTime
        contentUrl
        artists { id name }
        venue {
          id
          name
          address
          location { latitude longitude }
        }
      }
    }
  }
}`;

const GET_EVENT_LISTINGS_BY_AREA = `
query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
  eventListings(filters: $filters, pageSize: $pageSize, page: $page, sort: { listingDate: { order: ASCENDING } }) {
    data {
      event {
        id
        title
        date
        startTime
        endTime
        contentUrl
        artists { id name }
        venue {
          id
          name
          address
          location { latitude longitude }
        }
      }
    }
  }
}`;

async function fetchEventsForArea(areaId: string, startDate: string, endDate: string): Promise<RAEvent[]> {
  const allEvents: RAEvent[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const res = await fetch("https://ra.co/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://ra.co/events",
        Origin: "https://ra.co",
      },
      body: JSON.stringify({
        operationName: "GET_EVENT_LISTINGS",
        query: GET_EVENT_LISTINGS_BY_AREA,
        variables: {
          filters: {
            areas: { eq: parseInt(areaId, 10) },
            listingDate: {
              gte: startDate.split("T")[0],
              lte: endDate.split("T")[0],
            },
            listingPosition: { eq: 1 },
          },
          pageSize,
          page,
        },
      }),
    });

    if (!res.ok) break;
    const json = await res.json() as { data?: { eventListings?: { data?: Array<{ event: RAEvent }> } } };
    const events = (json.data?.eventListings?.data || []).map((d) => d.event);
    allEvents.push(...events);

    if (events.length < pageSize || allEvents.length >= 500) break;
    page++;
  }

  return allEvents;
}

async function fetchEventsForVenue(venueId: string, startDate: string, endDate: string): Promise<RAEvent[]> {
  const res = await fetch("https://ra.co/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Referer: "https://ra.co/events",
      Origin: "https://ra.co",
    },
    body: JSON.stringify({
      operationName: "GET_EVENTS_LISTING",
      query: GET_EVENTS_LISTING,
      variables: {
        filters: [
          { type: "CLUB", value: venueId },
          { type: "DATERANGE", value: JSON.stringify({ gte: startDate, lte: endDate }) },
        ],
        pageSize: 100,
        page: 1,
      },
    }),
  });

  if (!res.ok) return [];
  const json = await res.json() as { data?: { listing?: { data?: RAEvent[] } } };
  return json.data?.listing?.data || [];
}

function formatICSDate(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function eventToVEvent(event: RAEvent): string {
  const lines: string[] = ["BEGIN:VEVENT"];

  lines.push(`UID:${event.id}@ra.co`);
  lines.push(`DTSTAMP:${formatICSDate(new Date().toISOString())}`);

  if (event.startTime) {
    lines.push(`DTSTART:${formatICSDate(event.startTime)}`);
    if (event.endTime) {
      lines.push(`DTEND:${formatICSDate(event.endTime)}`);
    } else {
      // Default 4 hours
      const end = new Date(new Date(event.startTime).getTime() + 4 * 60 * 60 * 1000);
      lines.push(`DTEND:${formatICSDate(end.toISOString())}`);
    }
  } else {
    // All-day event
    const d = new Date(event.date);
    const dateOnly = `${d.getUTCFullYear()}${(d.getUTCMonth() + 1).toString().padStart(2, "0")}${d.getUTCDate().toString().padStart(2, "0")}`;
    lines.push(`DTSTART;VALUE=DATE:${dateOnly}`);
  }

  lines.push(`SUMMARY:${escapeICS(event.title)}`);
  lines.push(`URL:https://ra.co${event.contentUrl}`);

  const descParts: string[] = [];
  if (event.artists.length > 0) {
    descParts.push(`Artists: ${event.artists.map((a) => a.name).join(", ")}`);
  }
  descParts.push(`https://ra.co${event.contentUrl}`);
  lines.push(`DESCRIPTION:${escapeICS(descParts.join("\n"))}`);

  if (event.venue) {
    const loc = [event.venue.name, event.venue.address].filter(Boolean).join(", ");
    lines.push(`LOCATION:${escapeICS(loc)}`);
    if (event.venue.location) {
      lines.push(`GEO:${event.venue.location.latitude};${event.venue.location.longitude}`);
    }
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

function generateICS(events: RAEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ra-cal//RA Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:RA Events",
  ];

  for (const event of events) {
    lines.push(eventToVEvent(event));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function getDateRange(range: string): { start: string; end: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = now.toISOString();
  const end = new Date(now);

  switch (range) {
    case "week":
      end.setDate(end.getDate() + 7);
      break;
    case "2weeks":
      end.setDate(end.getDate() + 14);
      break;
    case "3months":
      end.setMonth(end.getMonth() + 3);
      break;
    case "month":
    default:
      end.setMonth(end.getMonth() + 1);
      break;
  }

  return { start, end: end.toISOString() };
}

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const venuesParam = url.searchParams.get("venues");
  const areaParam = url.searchParams.get("area");
  const range = url.searchParams.get("range") || "month";

  if (!venuesParam && !areaParam) {
    return new Response("Missing venues or area parameter", { status: 400 });
  }

  const { start, end } = getDateRange(range);
  let allEvents: RAEvent[] = [];

  if (areaParam) {
    // Fetch all events for the area
    allEvents = await fetchEventsForArea(areaParam, start, end);
  } else {
    // Fetch events for specific venues
    const venueIds = venuesParam!.split(",").filter(Boolean);
    if (venueIds.length === 0) {
      return new Response("No venues specified", { status: 400 });
    }

    await Promise.all(
      venueIds.map(async (id) => {
        const events = await fetchEventsForVenue(id, start, end);
        allEvents.push(...events);
      })
    );
  }

  // Sort by date
  allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const ics = generateICS(allEvents);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=ra-events.ics",
      "Cache-Control": "public, max-age=3600", // 1 hour
    },
  });
};
