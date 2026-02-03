# Resident Advisor GraphQL API

Endpoint: `https://ra.co/graphql`

## Authentication / Headers

No auth required, but needs browser-like headers to avoid Cloudflare blocking:

```
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Referer: https://ra.co/events
Content-Type: application/json
```

CORS: Reflects `Origin` header back, so browser requests work (with proxy for headers).

---

## Queries

### Get Venues (by area)

```graphql
query GET_VENUES_QUERY($count: Int!, $areaId: ID!, $orderBy: OrderByType!) {
  venues(limit: $count, areaId: $areaId, orderBy: $orderBy) {
    id
    name
    logoUrl
  }
}
```

**Variables:**
```json
{
  "count": 20,
  "areaId": "13",
  "orderBy": "POPULAR"
}
```

**OrderByType enum:** `LATEST`, `POPULAR`, `ALPHABETICAL`

**Arguments:** `limit`, `areaId`, `orderBy`, `closed`

**IMPORTANT:** The API silently returns empty `[]` when `count >= 30`. Max safe value is ~25.

**No pagination support** - only `limit` argument, no `page`/`offset`/`cursor`.

---

### Search Venues (Global)

```graphql
query GET_GLOBAL_SEARCH_RESULTS($searchTerm: String!, $indices: [IndexType!]) {
  search(
    searchTerm: $searchTerm
    limit: 16
    indices: $indices
    includeNonLive: false
  ) {
    searchType
    id
    value
    areaName
    countryId
    countryName
    countryCode
    contentUrl
    imageUrl
    score
    clubName
    clubContentUrl
    date
  }
}
```

**Variables:**
```json
{
  "searchTerm": "fabric",
  "indices": ["CLUB"]
}
```

**IndexType enum:** `AREA`, `ARTIST`, `CLUB`, `LABEL`, `PROMOTER`, `EVENT`

**searchType in results:** `VENUE`, `ARTIST`, `PROMOTER`, `UPCOMINGEVENT`, etc.

Filter results by `searchType === "VENUE"` for venues only.

---

### Get Events Listing (filterable)

This is the main events query - supports multiple filter types.

```graphql
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
        flyerFront
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
}
```

**Filter types:**

| type | value | description |
|------|-------|-------------|
| `CLUB` | venue ID (string) | Filter by venue, e.g. `"237"` for Fabric |
| `DATERANGE` | JSON string | Date filter, e.g. `"{\"gte\":\"2026-02-03T00:00:00.000Z\"}"` |
| `AREA` | area ID | Filter by city/area |

**Example variables (events at Fabric from today):**
```json
{
  "filters": [
    { "type": "CLUB", "value": "237" },
    { "type": "DATERANGE", "value": "{\"gte\":\"2026-02-03T00:00:00.000Z\"}" }
  ],
  "pageSize": 20,
  "page": 1
}
```

**Note:** Multiple `CLUB` filters act as AND (intersection), not OR. Query each venue separately and merge results.

---

### Event Listings (newer API)

```graphql
query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $pageSize: Int, $page: Int, $sort: SortInputDtoInput) {
  eventListings(filters: $filters, pageSize: $pageSize, page: $page, sort: $sort) {
    data {
      id
      listingDate
      event {
        id
        title
        date
        startTime
        endTime
        contentUrl
        flyerFront
        interestedCount
        venue {
          id
          name
          contentUrl
        }
        artists {
          id
          name
        }
      }
    }
    totalResults
  }
}
```

**Variables:**
```json
{
  "filters": {
    "areas": { "eq": 13 },
    "listingDate": { "gte": "2026-02-03", "lte": "2026-02-08" },
    "listingPosition": { "eq": 1 }
  },
  "pageSize": 20,
  "page": 1,
  "sort": {
    "listingDate": { "order": "ASCENDING" },
    "score": { "order": "DESCENDING" }
  }
}
```

---

### Event Listings with Bumps (promoted events)

```graphql
query GET_EVENT_LISTINGS_WITH_BUMPS($filters: FilterInputDtoInput, $pageSize: Int, $page: Int, $sort: SortInputDtoInput, $areaId: ID) {
  eventListingsWithBumps(filters: $filters, pageSize: $pageSize, page: $page, sort: $sort, areaId: $areaId) {
    eventListings {
      data {
        id
        listingDate
        event {
          id
          title
          date
          startTime
          endTime
          contentUrl
          flyerFront
          venue { id name }
          artists { id name }
        }
      }
      totalResults
    }
    bumps {
      bumpDecision {
        id
        eventId
        clickUrl
        impressionUrl
        event { id title }
      }
    }
  }
}
```

---

### Get Picks (RA editor picks)

```graphql
query GET_EVENTS_PICKS($filters: FilterInputDtoInput, $pageSize: Int) {
  eventListings(
    filters: $filters
    pageSize: $pageSize
    sort: { interestedCount: { priority: 1, order: DESCENDING } }
  ) {
    data {
      id
      event {
        id
        title
        date
        contentUrl
        pick {
          id
          blurb
        }
        venue { id name }
        artists { id name }
      }
    }
  }
}
```

**Variables:**
```json
{
  "filters": {
    "areas": { "eq": 13 },
    "listingDate": { "gte": "2026-02-03", "lte": "2026-02-08" },
    "isPick": { "eq": true }
  },
  "pageSize": 10
}
```

---

### Get Event Detail

```graphql
query GET_EVENT_DETAIL($id: ID!) {
  event(id: $id) {
    id
    title
    flyerFront
    flyerBack
    content
    minimumAge
    cost
    date
    startTime
    endTime
    interestedCount
    lineup
    venue {
      id
      name
      address
      contentUrl
      area {
        id
        name
        country { name isoCode }
      }
      location { latitude longitude }
    }
    artists { id name contentUrl }
    genres { id name slug }
    pick {
      id
      blurb
      author { name }
    }
  }
}
```

---

### Get Venue Detail

```graphql
query GET_VENUE($id: ID!) {
  venue(id: $id) {
    id
    name
    logoUrl
    photo
    blurb
    address
    contentUrl
    phone
    website
    followerCount
    capacity
    raSays
    isClosed
    eventCountThisYear
    topArtists { name contentUrl }
    area {
      id
      name
      country { name isoCode }
    }
  }
}
```

**Venue type fields:** `id`, `live`, `capacity`, `address`, `phone`, `raSays`, `tba`, `isClosed`, `area`, `country`, `website`, `location`, `name`, `listingItemId`, `index`, `blurb`, `photo`, `contentUrl`, `logoUrl`, `isFollowing`, `news`, `followerCount`, `eventCountThisYear`, `topArtists`, `events`

---

### Get About Region

```graphql
query GET_ABOUT_REGION($id: ID!) {
  area(id: $id) {
    id
    blurb
    eventsCount
    name
    population
    siblings { id name urlName country { id name urlCode } }
    country { id name urlCode }
    urlName
    venuesCount
  }
}
```

---

### Get Areas

```graphql
query GET_AREAS {
  areas {
    id
    name
    urlName
    country { name }
  }
}
```

**Note:** Returns geo-detected local areas only (5 results). Not useful for global search. Hardcode popular areas instead.

---

## Known Area IDs

| ID | City |
|----|------|
| 5 | New York |
| 8 | Los Angeles |
| 13 | London |
| 20 | Ibiza |
| 23 | Amsterdam |
| 34 | Berlin |
| 38 | Bristol |
| 41 | Manchester |
| 44 | Paris |
| 55 | Barcelona |

---

## Known Venue IDs (London)

| ID | Venue |
|----|-------|
| 237 | fabric |
| 725 | Ministry Of Sound |
| 2587 | Corsica Studios |
| 155399 | FOLD |
| 141756 | E1 |
| 874 | Egg London |
| 4567 | Village Underground |
| 33592 | XOYO |
| 106730 | Phonox |
| 2038 | KOKO |
| 198121 | The Cause |
| 218103 | DRUMSHEDS |
| 108196 | Ormside Projects |

---

## Filter Types Reference

### FilterInputDtoInput fields (for `eventListings` query):
- `date`, `listingDate`, `eventDatePosted` - DateRangeFilterInputDtoInput (`gte`, `lte`)
- `areas`, `area`, `eventStatus`, `eventType`, `eventIds` - IntFilterInputDtoInput (`eq`)
- `genre`, `id`, `name` - StringFilterInputDtoInput
- `isTicketed`, `isSoldOut`, `isPick`, `live` - BoolFilterInputDtoInput (`eq`)
- `title` - MatchFilterInputDtoInput
- `location` - LocationFilterInputDtoInput
- `listingPosition` - IntFilterInputDtoInput (`eq`: 1 for primary listings)

### SortInputDtoInput fields:
- `listingDate`, `score`, `interestedCount`, `titleKeyword`
- Each with `order`: `ASCENDING` or `DESCENDING`
- `priority`: number for sort precedence

---

## Rate Limiting Notes

- Venues query returns empty for `limit >= 30`
- No known request rate limits, but use browser-like headers
- Some queries may require logged-in state for full data (e.g., `isFollowing`, `isSaved`)
