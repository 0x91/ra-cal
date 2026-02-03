import { createEvents, type EventAttributes } from "ics";
import type { RAEvent } from "./types.js";

function parseDateTime(isoString: string): [number, number, number, number, number] {
  const d = new Date(isoString);
  return [
    d.getFullYear(),
    d.getMonth() + 1, // ics uses 1-indexed months
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  ];
}

function parseDateOnly(isoString: string): [number, number, number] {
  const d = new Date(isoString);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

export function eventToIcsEvent(event: RAEvent): EventAttributes {
  const icsEvent: EventAttributes = {
    uid: `${event.id}@ra.co`,
    title: event.title,
    url: `https://ra.co${event.contentUrl}`,
  };

  // Set start time
  if (event.startTime) {
    icsEvent.start = parseDateTime(event.startTime);
  } else {
    // All-day event
    icsEvent.start = parseDateOnly(event.date);
  }

  // Set end time
  if (event.endTime) {
    icsEvent.end = parseDateTime(event.endTime);
  } else if (event.startTime) {
    // Default to 4 hours if no end time
    const start = new Date(event.startTime);
    start.setHours(start.getHours() + 4);
    icsEvent.end = parseDateTime(start.toISOString());
  }

  // Build description
  const descParts: string[] = [];
  if (event.artists.length > 0) {
    descParts.push(`Artists: ${event.artists.map((a) => a.name).join(", ")}`);
  }
  descParts.push(`https://ra.co${event.contentUrl}`);
  icsEvent.description = descParts.join("\n");

  // Venue as location
  if (event.venue) {
    const locParts = [event.venue.name];
    if (event.venue.address) {
      locParts.push(event.venue.address);
    }
    icsEvent.location = locParts.join(", ");

    // Add geo if available and valid
    if (event.venue.location?.latitude && event.venue.location?.longitude) {
      icsEvent.geo = {
        lat: event.venue.location.latitude,
        lon: event.venue.location.longitude,
      };
    }
  }

  return icsEvent;
}

export function eventsToICal(
  events: RAEvent[],
  calendarName = "RA Events"
): string {
  const icsEvents = events.map(eventToIcsEvent);

  const { error, value } = createEvents(icsEvents, {
    calName: calendarName,
    productId: "-//ra-cal//RA Events Exporter//EN",
  });

  if (error) {
    throw new Error(`Failed to create iCal: ${error.message}`);
  }

  return value || "";
}
