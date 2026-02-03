// Cloudflare Pages Function for /api/ra

const CACHE_TTL = 3600; // 1 hour

async function getCacheKey(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return `ra-graphql:${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export const onRequestPost: PagesFunction = async (context) => {
  const body = await context.request.text();
  const cacheKey = await getCacheKey(body);
  const cache = caches.default;

  const cacheUrl = new URL(`https://cache.internal/${cacheKey}`);
  const cacheRequest = new Request(cacheUrl.toString());

  // Try cache first
  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    const headers = new Headers(cachedResponse.headers);
    headers.set("X-Cache", "HIT");
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      headers,
    });
  }

  // Fetch from RA
  try {
    const raResponse = await fetch("https://ra.co/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
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
      context.waitUntil(cache.put(cacheRequest, responseToCache.clone()));

      return new Response(data, {
        status: raResponse.status,
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "MISS",
        },
      });
    }

    // API returned error - pass through with appropriate status
    return new Response(data, {
      status: raResponse.status,
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "ERROR",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ errors: [{ message: `Unable to reach RA: ${message}` }] }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", "X-Cache": "ERROR" },
      }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
