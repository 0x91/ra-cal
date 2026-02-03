import { writeFileSync } from "fs";
import type { RAEvent, EventListingsResponse } from "./types.js";
import { eventsToICal } from "./ical.js";

const RA_GRAPHQL_URL = "https://ra.co/graphql";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// London area ID on RA
const LONDON_AREA_ID = 13;

const EVENT_LISTINGS_QUERY = `
query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $filterOptions: FilterOptionsInputDtoInput, $page: Int, $pageSize: Int) {
  eventListings(filters: $filters, filterOptions: $filterOptions, pageSize: $pageSize, page: $page) {
    data {
      event {
        id
        title
        date
        startTime
        endTime
        contentUrl
        venue {
          id
          name
          address
          location {
            latitude
            longitude
          }
        }
        artists {
          id
          name
        }
      }
    }
    filterOptions {
      genre {
        label
        value
        count
      }
    }
    totalResults
  }
}
`;

export async function fetchRAEvents(
  areaId: number,
  startDate: string,
  endDate: string,
  page = 1,
  pageSize = 20,
  includeFilterOptions = false
): Promise<EventListingsResponse> {
  const payload = {
    operationName: "GET_EVENT_LISTINGS",
    variables: {
      filters: {
        areas: { eq: areaId },
        listingDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      filterOptions: includeFilterOptions ? { genre: true } : undefined,
      page,
      pageSize,
    },
    query: EVENT_LISTINGS_QUERY,
  };

  const response = await fetch(RA_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Referer: "https://ra.co/events",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`RA API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchAllEventsInRange(
  areaId: number,
  startDate: string,
  endDate: string
): Promise<{ events: RAEvent[]; genres: Array<{ label: string; value: string; count: number }> }> {
  const allEvents: RAEvent[] = [];
  let page = 1;
  const pageSize = 50;
  let hasMore = true;
  let genres: Array<{ label: string; value: string; count: number }> = [];

  while (hasMore) {
    console.log(`Fetching page ${page}...`);
    const response = await fetchRAEvents(
      areaId,
      startDate,
      endDate,
      page,
      pageSize,
      page === 1 // Only get filter options on first page
    );

    const events = response.data.eventListings.data.map((d) => d.event);
    allEvents.push(...events);

    if (page === 1 && response.data.eventListings.filterOptions?.genre) {
      genres = response.data.eventListings.filterOptions.genre;
    }

    const total = response.data.eventListings.totalResults;
    console.log(`Got ${events.length} events (${allEvents.length}/${total})`);

    hasMore = allEvents.length < total;
    page++;

    if (hasMore) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { events: allEvents, genres };
}

async function main() {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const startDate = today.toISOString().split("T")[0];
  const endDate = nextMonth.toISOString().split("T")[0];

  console.log(`Fetching London events from ${startDate} to ${endDate}...\n`);

  try {
    const { events, genres } = await fetchAllEventsInRange(
      LONDON_AREA_ID,
      startDate,
      endDate
    );

    console.log(`\nFound ${events.length} events total`);
    console.log(`\nAvailable genres (${genres.length}):`);
    for (const g of genres.slice(0, 15)) {
      console.log(`  ${g.label}: ${g.count} events`);
    }

    // Generate iCal for first 20 events as demo
    const sampleEvents = events.slice(0, 20);
    const ical = eventsToICal(sampleEvents, "RA London Events (Sample)");
    writeFileSync("sample-events.ics", ical);
    console.log(`\nWrote sample-events.ics with ${sampleEvents.length} events`);
  } catch (error) {
    console.error("Error fetching events:", error);
  }
}

main();
