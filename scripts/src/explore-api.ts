const RA_GRAPHQL_URL = "https://ra.co/graphql";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function query(operationName: string, q: string, variables: object) {
  const res = await fetch(RA_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Referer: "https://ra.co/events",
    },
    body: JSON.stringify({ operationName, query: q, variables }),
  });
  return res.json();
}

const LISTING_QUERY = `
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

async function main() {
  const today = new Date().toISOString();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Test with multiple venues (Fabric, Corsica Studios, FOLD)
  const venueIds = ["237", "2587", "155399"];

  console.log("Upcoming events at selected venues:\n");

  for (const venueId of venueIds) {
    const result = await query("GET_EVENTS_LISTING", LISTING_QUERY, {
      filters: [
        { type: "CLUB", value: venueId },
        { type: "DATERANGE", value: JSON.stringify({ gte: today, lte: nextMonth.toISOString() }) },
      ],
      pageSize: 10,
      page: 1,
    });

    if (result.data?.listing?.data) {
      const events = result.data.listing.data;
      const venueName = events[0]?.venue?.name || `Venue ${venueId}`;
      console.log(`${venueName} (${result.data.listing.totalResults} total):`);
      for (const e of events) {
        console.log(`  ${e.date?.split("T")[0]}: ${e.title}`);
      }
      console.log();
    } else {
      console.log(`Venue ${venueId}: Error`, JSON.stringify(result.errors || result, null, 2));
    }
  }

  // Also test combining multiple venues in one query
  console.log("\n--- Combined query for all 3 venues ---");
  const combinedResult = await query("GET_EVENTS_LISTING", LISTING_QUERY, {
    filters: [
      { type: "CLUB", value: "237" },
      { type: "CLUB", value: "2587" },
      { type: "CLUB", value: "155399" },
      { type: "DATERANGE", value: JSON.stringify({ gte: today }) },
    ],
    pageSize: 20,
    page: 1,
  });

  if (combinedResult.data?.listing?.data) {
    console.log(`Total: ${combinedResult.data.listing.totalResults} events`);
    for (const e of combinedResult.data.listing.data) {
      console.log(`  ${e.date?.split("T")[0]} @ ${e.venue?.name}: ${e.title}`);
    }
  } else {
    console.log("Error:", JSON.stringify(combinedResult.errors || combinedResult, null, 2));
  }
}

main();
