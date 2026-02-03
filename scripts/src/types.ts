export interface RAEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  contentUrl: string;
  venue: {
    id: string;
    name: string;
    address: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  } | null;
  artists: Array<{
    id: string;
    name: string;
  }>;
}

export interface EventListingsResponse {
  data: {
    eventListings: {
      data: Array<{
        event: RAEvent;
      }>;
      filterOptions?: {
        genre?: Array<{ label: string; value: string; count: number }>;
        eventType?: Array<{ value: string; count: number }>;
      };
      totalResults: number;
    };
  };
}
