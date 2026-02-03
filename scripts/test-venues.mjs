const res = await fetch("https://ra.co/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://ra.co/events",
  },
  body: JSON.stringify({
    operationName: "GET_VENUES_QUERY",
    variables: { count: 10, areaId: "13", orderBy: "POPULAR" },
    query: `query GET_VENUES_QUERY($count: Int!, $areaId: ID!, $orderBy: OrderByType!) {
      venues(limit: $count, areaId: $areaId, orderBy: $orderBy) {
        id
        name
      }
    }`,
  }),
});

console.log(await res.json());
