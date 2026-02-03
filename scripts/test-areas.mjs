const res = await fetch("https://ra.co/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://ra.co/events",
  },
  body: JSON.stringify({
    operationName: "GET_AREAS",
    variables: {},
    query: `query GET_AREAS {
      areas {
        id
        name
        urlName
        country {
          name
        }
      }
    }`,
  }),
});

const data = await res.json();
console.log("Total areas:", data.data?.areas?.length);
console.log("First 5:", data.data?.areas?.slice(0, 5));
console.log("Errors:", data.errors);
