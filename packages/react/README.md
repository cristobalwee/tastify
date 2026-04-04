# @tastify/react

<a href="https://www.npmjs.com/package/@tastify/react"><img src="https://img.shields.io/npm/v/@tastify/react?color=1db954" alt="npm" /></a>

React components and hooks for displaying Spotify listening data on your site. Includes a full unauthed **playback system**: visitors can play track previews right in the browser with no additional setup.

## Install

```bash
npm install @tastify/react
```

**Peer dependencies:** `react >= 18`, `react-dom >= 18`

## Quick Start

```tsx
import { TastifyProvider, NowPlaying, TopTracks, TopArtists } from '@tastify/react'
import '@tastify/react/styles.css'

function App() {
  return (
    <TastifyProvider tokenUrl="/api/spotify/token">
      <NowPlaying />
      <TopTracks limit={5} />
      <TopArtists layout="grid" columns={3} />
    </TastifyProvider>
  )
}
```

`TastifyProvider` creates a shared `TastifyClient` under the hood. Every component and hook below must be rendered inside it.

### Provider props

| Prop | Type | Description |
|---|---|---|
| `tokenUrl` | `string` | Server-side token endpoint URL |
| `getToken` | `() => Promise<string>` | Custom async token resolver |
| `token` | `string` | Static access token (testing only) |
| `theme` | `'light' \| 'dark' \| 'auto'` | Color scheme — `'auto'` follows `prefers-color-scheme` |

## Components

### `<NowPlaying />`

Live "now playing" card with album art, progress bar, and Spotify link.

```tsx
<NowPlaying compact showProgress fallback={<p>Not playing right now</p>} />
```

| Prop | Type | Default |
|---|---|---|
| `pollInterval` | `number` | `15000` |
| `showArt` | `boolean` | `true` |
| `showProgress` | `boolean` | `true` |
| `interactive` | `boolean` | `true` |
| `compact` | `boolean` | `false` |
| `fallback` | `ReactNode` | — |
| `className` | `string` | — |
| `children` | `(data: NowPlayingData) => ReactNode` | — |

### `<TopTracks />`

```tsx
<TopTracks timeRange="short_term" limit={10} layout="grid" columns={3} showTimeRangeSelector />
```

| Prop | Type | Default |
|---|---|---|
| `timeRange` | `'short_term' \| 'medium_term' \| 'long_term'` | `'medium_term'` |
| `limit` | `number` | `20` |
| `layout` | `'list' \| 'grid'` | `'list'` |
| `showRank` | `boolean` | `true` |
| `showArt` | `boolean` | `true` |
| `columns` | `number` | — |
| `header` | `string` | — |
| `showTimeRangeSelector` | `boolean` | `false` |
| `className` | `string` | — |
| `children` | `(data: TopTracksData) => ReactNode` | — |

### `<TopArtists />`

```tsx
<TopArtists limit={6} layout="grid" columns={3} showGenres />
```

| Prop | Type | Default |
|---|---|---|
| `timeRange` | `'short_term' \| 'medium_term' \| 'long_term'` | `'medium_term'` |
| `limit` | `number` | `20` |
| `layout` | `'grid' \| 'list'` | `'grid'` |
| `columns` | `number` | — |
| `showGenres` | `boolean` | `false` |
| `header` | `string` | — |
| `showTimeRangeSelector` | `boolean` | `false` |
| `className` | `string` | — |
| `children` | `(data: TopArtistsData) => ReactNode` | — |

### `<RecentlyPlayed />`

```tsx
<RecentlyPlayed limit={10} layout="timeline" showTimestamp groupByDay />
```

| Prop | Type | Default |
|---|---|---|
| `limit` | `number` | `20` |
| `layout` | `'list' \| 'timeline'` | `'list'` |
| `showTimestamp` | `boolean` | `true` |
| `groupByDay` | `boolean` | `false` |
| `header` | `string` | — |
| `className` | `string` | — |
| `children` | `(data: RecentlyPlayedData) => ReactNode` | — |

### `<TimeRangeSelector />`

Standalone time range tabs you can use with your own layout:

```tsx
<TimeRangeSelector value={range} onChange={setRange} />
```

## Hooks

Use hooks directly when you need full control over rendering:

```tsx
import { useNowPlaying, useTopTracks, useTopArtists, useRecentlyPlayed } from '@tastify/react'

function MyWidget() {
  const { data, status, error } = useNowPlaying({ pollInterval: 10_000 })
  const topTracks = useTopTracks({ timeRange: 'short_term', limit: 5 })
  const topArtists = useTopArtists({ limit: 10 })
  const recent = useRecentlyPlayed({ limit: 15 })

  if (status === 'loading') return <p>Loading…</p>
  if (!data) return <p>Nothing playing</p>

  return <p>🎵 {data.track.name} by {data.track.artists[0]?.name}</p>
}
```

Each hook returns `{ data, status, error }` where `status` is `'idle' | 'loading' | 'success' | 'error'`.

## Playback

The playback system lets visitors **listen to track previews** (or full tracks with Spotify Premium) without leaving your site.

### Setup

Wrap your tree with `PlaybackProvider` and render a `PlaybackOverlay`:

```tsx
import {
  TastifyProvider,
  PlaybackProvider,
  PlaybackOverlay,
  TopTracks,
} from '@tastify/react'
import '@tastify/react/styles.css'

function App() {
  return (
    <TastifyProvider tokenUrl="/api/spotify/token">
      <PlaybackProvider ui="bar" playbackMode="embed">
        <TopTracks limit={10} />
        <PlaybackOverlay />
      </PlaybackProvider>
    </TastifyProvider>
  )
}
```

Click any track — the playback bar slides in. That's it.

### PlaybackProvider props

| Prop | Type | Default | Description |
|---|---|---|---|
| `ui` | `'bar' \| 'toast'` | — | **Required.** Playback UI style |
| `playbackMode` | `'embed' \| 'preview' \| 'sdk' \| 'auto'` | `'embed'` | Audio backend mode |
| `toastPosition` | `ToastPosition` | `'bottom-right'` | Position when `ui="toast"` |
| `deviceName` | `string` | `'Tastify Web Player'` | Spotify Connect device name (SDK mode) |
| `volume` | `number` | `0.5` | Initial volume 0–1 (SDK mode) |
| `onPremiumRequired` | `() => void` | — | Called when SDK needs Premium |

### Playback modes

| Mode | Premium? | Description |
|---|---|---|
| `'embed'` | No | Spotify IFrame embeds (~30s previews) |
| `'preview'` | No | HTML5 Audio preview URLs (~30s) |
| `'sdk'` | Yes | Full-length tracks via Web Playback SDK |
| `'auto'` | Tries SDK | Falls back to embed if not Premium |

**Embed** is the default because it works for every visitor — no login, no Premium, no side effects. The Spotify IFrame API streams ~30-second previews with zero setup on the listener's end, which is ideal for public portfolio sites.

**SDK mode** connects to the [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) and registers the browser as a **Spotify Connect device**. This enables full-length playback but has important trade-offs: it **requires Spotify Premium**, and it **takes over the active device** — Spotify only streams to one device at a time, so if your visitor starts playback in the browser it will pause on their phone (and vice versa). The access token must also include the `streaming` scope. SDK mode is best for personal dashboards where you're the primary user, not public-facing pages.

**Auto** tries SDK first, and silently falls back to embed when Premium isn't available — useful when you want the best experience for Premium users without breaking it for everyone else.

### UI Components

- **`<PlaybackBar />`** — Fixed bar at the bottom of the viewport with album art, controls, and a loading indicator.
- **`<PlaybackToast />`** — Floating notification-style player. Accepts a `position` prop: `'top-left'` | `'top-center'` | `'top-right'` | `'bottom-left'` | `'bottom-center'` | `'bottom-right'`.
- **`<PlaybackOverlay />`** — Convenience wrapper that renders the right UI based on `PlaybackProvider`'s `ui` prop via a portal.

### `usePlayback()` hook

For programmatic control:

```tsx
const {
  state,          // { currentTrack, isPlaying, progress, duration, currentTime, playbackMode }
  isReady,        // true once the audio backend is initialized
  play,           // (track: TastifyTrack) => void
  playArtist,     // (artist: TastifyArtist) => void — queues artist's top tracks
  pause,
  resume,
  togglePlayPause,
  next,
  previous,
  seek,           // (fraction: number) => void — 0 to 1
  setQueue,       // (tracks: TastifyTrack[], startIndex?) => void
  stop,
} = usePlayback()
```

## Headless Mode

Every component accepts a `children` render prop. When provided, tastify hands you the data and you render whatever you want:

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

Combine with hooks for maximum flexibility.

## Theming

Import the default stylesheet and override CSS custom properties:

```css
.tastify-provider {
  --tf-color-surface: #ffffff;
  --tf-color-text-primary: #1a1a1a;
  --tf-color-text-secondary: #666;
  --tf-color-accent: #1db954;
  --tf-color-border: #e0e0e0;
  --tf-radius: 12px;
  --tf-art-size: 56px;
  --tf-font-family: system-ui, sans-serif;
  --tf-transition-speed: 200ms;
}
```

Pass `theme="dark"` or `theme="auto"` to `TastifyProvider` for built-in dark mode support.

## Related

- [`@tastify/core`](../core/README.md) — Underlying client + playback engine
- [`@tastify/vanilla`](../vanilla/README.md) — Framework-free widgets
- [Root README](../../README.md) — Full project overview
