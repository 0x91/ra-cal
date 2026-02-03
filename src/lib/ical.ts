import { createEvents, type EventAttributes, type DateArray } from "ics";
import type { RAEvent } from "./ra-api";

function parseDateTime(isoString: string): DateArray {
  const d = new Date(isoString);
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  ];
}

function getStartTime(event: RAEvent): DateArray {
  if (event.startTime) {
    return parseDateTime(event.startTime);
  }
  const d = new Date(event.date);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

function getDuration(event: RAEvent): { hours: number; minutes: number } | undefined {
  if (!event.startTime) return undefined;

  if (event.endTime) {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  }

  // Default to 4 hours
  return { hours: 4, minutes: 0 };
}

function eventToIcsEvent(event: RAEvent): EventAttributes {
  const descParts: string[] = [];
  if (event.artists.length > 0) {
    descParts.push(`Artists: ${event.artists.map((a) => a.name).join(", ")}`);
  }
  descParts.push(`https://ra.co${event.contentUrl}`);

  const duration = getDuration(event);
  const icsEvent = {
    uid: `${event.id}@ra.co`,
    title: event.title,
    url: `https://ra.co${event.contentUrl}`,
    start: getStartTime(event),
    description: descParts.join("\n"),
    ...(duration && { duration }),
  } as EventAttributes;

  if (event.venue) {
    const locParts = [event.venue.name];
    if (event.venue.address) {
      locParts.push(event.venue.address);
    }
    icsEvent.location = locParts.join(", ");

    if (event.venue.location?.latitude && event.venue.location?.longitude) {
      icsEvent.geo = {
        lat: event.venue.location.latitude,
        lon: event.venue.location.longitude,
      };
    }
  }

  return icsEvent;
}

export function eventsToICal(events: RAEvent[], calendarName = "RA Events"): string {
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

export function downloadICal(events: RAEvent[], filename: string, calendarName?: string) {
  const ical = eventsToICal(events, calendarName);
  const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
