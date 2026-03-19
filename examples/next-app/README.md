# tastify + Next.js Example

Minimal Next.js App Router example with `@tastify/react`.

## Setup

1. Create a Spotify app at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Run `npx tastify init` from the project root to get your refresh token
3. Copy `.env.local.example` to `.env.local` and fill in your credentials
4. Run `npm run dev`

## What's here

- `app/layout.tsx` — wraps the app in `TastifyProvider`
- `app/page.tsx` — renders `NowPlaying`, `TopTracks`, and `TopArtists`
- `app/api/spotify/token/route.ts` — token refresh endpoint
