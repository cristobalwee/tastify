# tastify + Astro Example

Zero-JS-authoring example using `@tastify/vanilla` data attributes in an Astro site.

## Setup

1. Create a Spotify app at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Run `npx tastify init` to get your refresh token
3. Create `.env` with your Spotify credentials
4. Run `npm run dev`

## What's here

- `src/pages/index.astro` — HTML with `data-tastify` attributes, no JS to write
- `src/pages/api/spotify/token.ts` — Astro API route for token refresh
