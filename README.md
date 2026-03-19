# tastify

Lightweight Spotify listening widgets for developer portfolios. Drop a NowPlaying card or TopTracks list onto your personal site with minimal setup. Works with React, vanilla JS, or any static site.

## Quick Start (React)

```bash
npm install @tastify/react
```

```tsx
import { TastifyProvider, NowPlaying, TopTracks } from '@tastify/react'
import '@tastify/react/styles.css'

function App() {
  return (
    <TastifyProvider tokenUrl="/api/spotify/token">
      <NowPlaying />
      <TopTracks limit={5} />
    </TastifyProvider>
  )
}
```

## Quick Start (Vanilla / Static HTML)

```html
<link rel="stylesheet" href="https://unpkg.com/@tastify/vanilla/dist/styles.css" />

<div data-tastify="now-playing"></div>
<div data-tastify="top-tracks" data-limit="5"></div>
<div data-tastify="recently-played"></div>

<script src="https://unpkg.com/@tastify/vanilla" data-tastify-token-url="/api/spotify/token"></script>
```

No build step. No framework. No JS to write.

## Setup: Token Endpoint

Spotify doesn't allow client-side token refresh (the client secret would be exposed). You need a small server-side endpoint that exchanges your refresh token for a short-lived access token. The CLI generates this for you:

```bash
npx tastify init
```

It walks you through Spotify OAuth, creates a serverless function for your platform (Vercel, Netlify, Cloudflare, or Express), and writes your `.env.local` with credentials. Takes about 30 seconds.

## Packages

| Package | Description | |
|---|---|---|
| `@tastify/core` | Spotify API client, caching, polling | core logic |
| `@tastify/react` | React components and hooks | `NowPlaying`, `TopTracks`, `TopArtists`, `RecentlyPlayed` |
| `@tastify/vanilla` | Vanilla JS mount API + data-attribute auto-init | works anywhere |
| `tastify` | CLI setup tool | `npx tastify init` |

## Components

### NowPlaying

Shows what you're currently listening to, with album art and a live progress bar. Polls every 15 seconds by default.

```tsx
<NowPlaying compact showProgress fallback={<p>Not playing</p>} />
```

Props: `pollInterval`, `showArt`, `showProgress`, `showLink`, `compact`, `fallback`, `className`, `children` (render prop).

### TopTracks

Your most-played tracks over a time range.

```tsx
<TopTracks timeRange="short_term" limit={10} layout="grid" columns={3} />
```

Props: `timeRange` (`short_term` | `medium_term` | `long_term`), `limit`, `layout` (`list` | `grid`), `showRank`, `showArt`, `columns`, `header`, `showTimeRangeSelector`, `className`, `children`.

### TopArtists

Your top artists with optional genre tags.

```tsx
<TopArtists limit={6} layout="grid" columns={3} showGenres />
```

Props: `timeRange`, `limit`, `layout` (`grid` | `list`), `columns`, `showGenres`, `header`, `showTimeRangeSelector`, `className`, `children`.

### RecentlyPlayed

A timeline or list of recently played tracks.

```tsx
<RecentlyPlayed limit={10} layout="timeline" showTimestamp />
```

Props: `limit`, `layout` (`list` | `timeline`), `showTimestamp`, `groupByDay`, `header`, `className`, `children`.

## Theming

All components use CSS custom properties, so you can restyle them without touching JS:

```css
/* Light theme override */
[data-tastify], .tastify-provider {
  --tf-color-surface: #ffffff;
  --tf-color-text-primary: #1a1a1a;
  --tf-color-text-secondary: #666666;
  --tf-color-border: #e0e0e0;
  --tf-color-accent: #1db954;
  --tf-radius: 12px;
  --tf-art-size: 56px;
}
```

Key variables: `--tf-color-bg`, `--tf-color-surface`, `--tf-color-text-primary`, `--tf-color-text-secondary`, `--tf-color-accent`, `--tf-color-border`, `--tf-radius`, `--tf-art-size`, `--tf-font-family`, `--tf-transition-speed`.

## Headless Mode

Every component accepts a `children` render prop for full control over rendering:

```tsx
<NowPlaying>
  {(data) => (
    <div>
      <img src={data.track.album.images[0]?.url} alt="" />
      <p>{data.track.name} — {data.track.artists[0]?.name}</p>
    </div>
  )}
</NowPlaying>
```

In vanilla JS, use the `mount()` function with event listeners for similar control.

## Requirements

- A Spotify account (Premium not required for most endpoints)
- A registered [Spotify Developer](https://developer.spotify.com/dashboard) application
- Node 18+ for the CLI and serverless functions
- React 18+ for `@tastify/react`

## License

MIT
