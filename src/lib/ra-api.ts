// Pages Function handles /api/ra in production
const RA_GRAPHQL_URL = import.meta.env.DEV
  ? "http://localhost:8787/api/ra"
  : "/api/ra";

export class APIError extends Error {
  readonly status?: number;
  readonly isNetworkError: boolean;

  constructor(message: string, status?: number, isNetworkError = false) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

async function gql<T>(operationName: string, query: string, variables: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(RA_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ operationName, query, variables }),
    });
  } catch (e) {
    throw new APIError(
      "Unable to connect to the server. Please check your internet connection.",
      undefined,
      true
    );
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new APIError("Rate limited. Please wait a moment and try again.", 429);
    }
    if (res.status >= 500) {
      throw new APIError("The server is temporarily unavailable. Please try again later.", res.status);
    }
    throw new APIError(`Request failed with status ${res.status}`, res.status);
  }

  let json: { data?: T; errors?: Array<{ message: string }> };
  try {
    json = await res.json();
  } catch {
    throw new APIError("Invalid response from server. The API may have changed.");
  }

  if (json.errors) {
    throw new APIError(json.errors[0]?.message || "An error occurred while fetching data");
  }

  if (!json.data) {
    throw new APIError("No data returned from server");
  }

  return json.data;
}

// Types
export interface Venue {
  id: string;
  name: string;
  contentUrl: string;
  logoUrl?: string;
  followerCount?: number;
}

export interface RAEvent {
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

export interface Area {
  id: string;
  name: string;
  urlName: string;
  country: { name: string };
}

// Queries
const GET_VENUES_QUERY = `query GET_VENUES_QUERY($count: Int!, $areaId: ID!, $orderBy: OrderByType!) { venues(limit: $count, areaId: $areaId, orderBy: $orderBy) { id name logoUrl } }`;

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
        artists {
          id
          name
        }
        venue {
          id
          name
          address
          location {
            latitude
            longitude
          }
        }
      }
    }
    totalResults
  }
}
`;

const GET_AREAS_QUERY = `
query GET_AREAS {
  areas {
    id
    name
    urlName
    country {
      name
    }
  }
}
`;

// API Functions
export async function getPopularVenues(areaId: string, count = 30): Promise<Venue[]> {
  const data = await gql<{ venues: Venue[] | null }>("GET_VENUES_QUERY", GET_VENUES_QUERY, {
    areaId,
    count,
    orderBy: "POPULAR",
  });
  return data.venues || [];
}

export async function getEventsForVenue(
  venueId: string,
  startDate: string,
  endDate?: string
): Promise<{ events: RAEvent[]; total: number }> {
  const dateFilter: { gte: string; lte?: string } = { gte: startDate };
  if (endDate) {
    dateFilter.lte = endDate;
  }

  const data = await gql<{ listing: { data: RAEvent[]; totalResults: number } }>(
    "GET_EVENTS_LISTING",
    GET_EVENTS_LISTING,
    {
      filters: [
        { type: "CLUB", value: venueId },
        { type: "DATERANGE", value: JSON.stringify(dateFilter) },
      ],
      pageSize: 100,
      page: 1,
    }
  );

  return { events: data.listing.data || [], total: data.listing.totalResults };
}

export async function getEventsForVenues(
  venueIds: string[],
  startDate: string,
  endDate?: string
): Promise<RAEvent[]> {
  const results = await Promise.all(
    venueIds.map((id) => getEventsForVenue(id, startDate, endDate))
  );

  const allEvents = results.flatMap((r) => r.events);
  // Sort by date
  allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return allEvents;
}

export async function getPopularAreas(): Promise<Area[]> {
  const data = await gql<{ areas: Area[] }>("GET_AREAS", GET_AREAS_QUERY, {});
  return data.areas;
}

// Events by area (not venue) - more efficient for "all venues"
const GET_EVENT_LISTINGS = `
query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
  eventListings(filters: $filters, pageSize: $pageSize, page: $page, sort: { listingDate: { order: ASCENDING } }) {
    data {
      id
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
    totalResults
  }
}`;

export async function getEventsForArea(
  areaId: string,
  startDate: string,
  endDate: string
): Promise<RAEvent[]> {
  const allEvents: RAEvent[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const data = await gql<{
      eventListings: {
        data: Array<{ event: RAEvent }>;
        totalResults: number;
      };
    }>("GET_EVENT_LISTINGS", GET_EVENT_LISTINGS, {
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
    });

    const events = data.eventListings.data.map((d) => d.event);
    allEvents.push(...events);

    // Stop if we got fewer than pageSize (last page) or hit a reasonable limit
    if (events.length < pageSize || allEvents.length >= 500) {
      break;
    }
    page++;
  }

  return allEvents;
}

const SEARCH_VENUES_QUERY = `query SEARCH_VENUES($term: String!) { search(searchTerm: $term, limit: 16, indices: [CLUB], includeNonLive: false) { searchType id value imageUrl areaName } }`;

export async function searchVenues(term: string, areaName?: string): Promise<Venue[]> {
  const data = await gql<{ search: Array<{ searchType: string; id: string; value: string; imageUrl?: string; areaName?: string }> }>(
    "SEARCH_VENUES",
    SEARCH_VENUES_QUERY,
    { term }
  );
  // Filter to only VENUE type results, optionally by area
  return data.search
    .filter((r) => r.searchType === "VENUE")
    .filter((r) => !areaName || r.areaName === areaName)
    .map((r) => ({
      id: r.id,
      name: r.value,
      contentUrl: `/clubs/${r.id}`,
      logoUrl: r.imageUrl || undefined,
    }));
}
