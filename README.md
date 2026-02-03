# RA → Cal

Export Resident Advisor events to your calendar.

Pick a city, select venues, and either download an .ics file or subscribe to a live feed that updates automatically.

## Usage

1. Choose your city
2. Select venues (or toggle "All Venues" to browse everything)
3. Set your date range
4. **Download** for a one-time export, or **Subscribe** for a live feed

The subscribe URL works with Apple Calendar, Google Calendar, and anything that supports webcal.

## Development

```bash
pnpm install
pnpm dev          # runs Vite + Wrangler locally
```

## Deployment

Hosted on Cloudflare Pages with Functions for the API proxy.

```bash
pnpm build
npx wrangler pages deploy dist --project-name ra-cal
```

## How it works

The app fetches event data from RA's GraphQL API through a Cloudflare Worker that handles caching (1 hour TTL). The `/api/calendar` endpoint generates ICS feeds on the fly for subscription URLs.

## License

GPL-3.0
