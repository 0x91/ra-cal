interface Env {
  // Add any environment bindings here if needed
}

// Generate a cache key from the request body
async function getCacheKey(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `ra-graphql:${hashHex}`;
}

const CACHE_TTL = 3600; // 1 hour in seconds

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Proxy /api/ra to RA GraphQL
    if (url.pathname === "/api/ra" && request.method === "POST") {
      const body = await request.text();
      const cacheKey = await getCacheKey(body);
      const cache = caches.default;

      // Create a synthetic URL for caching (Cache API requires a URL)
      const cacheUrl = new URL(`https://cache.ra-cal.internal/${cacheKey}`);
      const cacheRequest = new Request(cacheUrl.toString());

      // Try to get from cache
      let cachedResponse = await cache.match(cacheRequest);
      if (cachedResponse) {
        // Return cached response with cache hit header
        const headers = new Headers(cachedResponse.headers);
        headers.set("X-Cache", "HIT");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          headers,
        });
      }

      // Cache miss - fetch from RA
      try {
        const raResponse = await fetch("https://ra.co/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://ra.co/events",
            Origin: "https://ra.co",
          },
          body,
        });

        const data = await raResponse.text();

        // Only cache successful responses
        if (raResponse.ok) {
          const responseToCache = new Response(data, {
            status: raResponse.status,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${CACHE_TTL}`,
            },
          });

          // Store in cache (don't await - do it in background)
          ctx.waitUntil(cache.put(cacheRequest, responseToCache.clone()));
        }

        return new Response(data, {
          status: raResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "X-Cache": "MISS",
          },
        });
      } catch (error) {
        // On fetch error, try to return stale cache if available
        // (Cache API doesn't support stale-while-revalidate natively,
        // but we can check if there's an expired entry)

        // Since we can't get expired entries from Cache API,
        // just return an error response
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
          JSON.stringify({
            errors: [{ message: `Failed to fetch from RA API: ${errorMessage}` }],
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "X-Cache": "ERROR",
            },
          }
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
