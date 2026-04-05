<p align="center">
   <img width="100%" height="auto" alt="Frame 19 (2)" src="https://github.com/user-attachments/assets/fbe38c0f-d2e0-4bd9-a3da-549a2652d243" />
</p>

<p align="center">
  Spotify listening widgets for developer portfolios.<br/>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tastify/react"><img src="https://img.shields.io/npm/v/@tastify/react?label=%40tastify%2Freact&color=1db954" alt="npm @tastify/react" /></a>
  <a href="https://www.npmjs.com/package/@tastify/vanilla"><img src="https://img.shields.io/npm/v/@tastify/vanilla?label=%40tastify%2Fcore&color=1db954" alt="npm @tastify/vanilla" /></a>
  <a href="https://www.npmjs.com/package/@tastify/core"><img src="https://img.shields.io/npm/v/@tastify/core?label=%40tastify%2Fcore&color=1db954" alt="npm @tastify/core" /></a>
  <a href="https://github.com/cristobalwee/tastify"><img src="https://img.shields.io/github/stars/cristobalwee/tastify?style=social" alt="GitHub stars" /></a>
</p>

<p align="center">
  <a href="#quick-start-react">React</a> ·
  <a href="#quick-start-vanilla">Vanilla JS</a> ·
  <a href="#playback">Playback</a> ·
  <a href="#theming">Theming</a> ·
  <a href="https://github.com/cristobalwee/tastify/discussions">Discussions</a>
</p>

---

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

> Full API reference in the [`@tastify/react` README](./packages/react/README.md).

## Quick Start (Vanilla)

```html
<link rel="stylesheet" href="https://unpkg.com/@tastify/vanilla/dist/styles.css" />

<div data-tastify="now-playing"></div>
<div data-tastify="top-tracks" data-limit="5"></div>
<div data-tastify="recently-played"></div>

<script src="https://unpkg.com/@tastify/vanilla" data-tastify-token-url="/api/spotify/token"></script>
```

No build step or framework needed.

> Full API reference in the [`@tastify/vanilla` README](./packages/vanilla/README.md).

## Setup: Token Endpoint

Spotify doesn't allow client-side token refresh (the client secret would be exposed). You need a small server-side endpoint that exchanges your refresh token for a short-lived access token. The CLI generates this for you:

```bash
npx tastify init
```

It walks you through Spotify OAuth, creates a serverless function for your platform (Vercel, Netlify, Cloudflare Workers, or Express), and writes your `.env.local` with the right credentials. Takes about 30 seconds.

## Packages

| Package | Description | Docs |
|---|---|---|
| [`@tastify/core`](./packages/core) | Spotify API client, caching, polling, playback engine | [README](./packages/core/README.md) |
| [`@tastify/react`](./packages/react) | React components, hooks, and playback UI | [README](./packages/react/README.md) |
| [`@tastify/vanilla`](./packages/vanilla) | Zero-framework widgets + data-attribute auto-init | [README](./packages/vanilla/README.md) |
| [`tastify` CLI](./packages/cli) | `npx tastify init` — scaffolds your token endpoint | — |

## Components

### NowPlaying

Shows what you're currently listening to, with album art and a live progress bar. Polls every 15s by default.

```tsx
<NowPlaying compact showProgress fallback={<p>Not playing</p>} />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `pollInterval` | `number` | `15000` | Polling interval in ms |
| `showArt` | `boolean` | `true` | Display album artwork |
| `showProgress` | `boolean` | `true` | Show progress bar |
| `interactive` | `boolean` | `true` | Click to play (requires `PlaybackProvider`) |
| `compact` | `boolean` | `false` | Compact layout |
| `fallback` | `ReactNode` | — | Shown when nothing is playing |
| `className` | `string` | — | Custom class name |
| `children` | `(data) => ReactNode` | — | Headless render prop |

### TopTracks

Your most-played tracks over a configurable time range.

```tsx
<TopTracks timeRange="short_term" limit={10} layout="grid" columns={3} />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `timeRange` | `'short_term' \| 'medium_term' \| 'long_term'` | `'medium_term'` | Spotify time range |
| `limit` | `number` | `20` | Number of tracks |
| `layout` | `'list' \| 'grid'` | `'list'` | Layout mode |
| `showRank` | `boolean` | `true` | Show rank numbers |
| `showArt` | `boolean` | `true` | Display artwork |
| `columns` | `number` | — | Grid column count |
| `header` | `string` | — | Section heading |
| `showTimeRangeSelector` | `boolean` | `false` | Interactive time range tabs |
| `className` | `string` | — | Custom class name |
| `children` | `(data) => ReactNode` | — | Headless render prop |

### TopArtists

Your top artists with optional genre tags.

```tsx
<TopArtists limit={6} layout="grid" columns={3} showGenres />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `timeRange` | `'short_term' \| 'medium_term' \| 'long_term'` | `'medium_term'` | Spotify time range |
| `limit` | `number` | `20` | Number of artists |
| `layout` | `'grid' \| 'list'` | `'grid'` | Layout mode |
| `columns` | `number` | — | Grid column count |
| `showGenres` | `boolean` | `false` | Show genre tags |
| `header` | `string` | — | Section heading |
| `showTimeRangeSelector` | `boolean` | `false` | Interactive time range tabs |
| `className` | `string` | — | Custom class name |
| `children` | `(data) => ReactNode` | — | Headless render prop |

### RecentlyPlayed

A timeline or list of recently played tracks.

```tsx
<RecentlyPlayed limit={10} layout="timeline" showTimestamp />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `20` | Number of tracks |
| `layout` | `'list' \| 'timeline'` | `'list'` | Layout mode |
| `showTimestamp` | `boolean` | `true` | Show relative timestamps |
| `groupByDay` | `boolean` | `false` | Group items by day |
| `header` | `string` | — | Section heading |
| `className` | `string` | — | Custom class name |
| `children` | `(data) => ReactNode` | — | Headless render prop |

## Playback

tastify ships with a built-in audio engine that lets visitors **play track previews** directly on your site. Three playback modes are available:

| Mode | Requires Premium | Auth Required | Fidelity |
|---|---|---|---|
| `'embed'` (default) | No | No | ~30s previews via Spotify IFrame |
| `'preview'` | No | No | ~30s preview URLs |
| `'sdk'` | Yes | Yes | Full-length tracks via Web Playback SDK |

### Why embed is the default

Embed mode uses Spotify's IFrame API to stream ~30-second previews. It requires **no authentication from the visitor** and no Premium subscription — any person who lands on your site can click play and hear music immediately. This makes it the best default for portfolio sites where you have zero control over who's visiting.

### SDK mode (full-length playback)

SDK mode connects to the [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk), which registers your site as a **Spotify Connect device** (like a speaker or phone). This unlocks full-length track playback, but comes with trade-offs:

- **Requires Spotify Premium** — free-tier accounts can't use the Web Playback SDK.
- **Takes over the active device** — Spotify only streams to one device at a time. When SDK mode activates, playback transfers to the browser and stops on the visitor's phone/desktop app. If they start playing on another device, the browser session pauses.
- **Requires a valid access token** with the `streaming` scope.

SDK mode is best suited for personal dashboards or sites where *you* are the primary visitor and want to use it as an actual player. For public-facing portfolio pages, stick with embed.

Use `'auto'` to try SDK first and silently fall back to embed when the visitor doesn't have Premium.

### React

Wrap your app with `PlaybackProvider` and drop in a `PlaybackOverlay`:

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
      <PlaybackProvider ui="bar">
        <TopTracks limit={10} />
        <PlaybackOverlay />
      </PlaybackProvider>
    </TastifyProvider>
  )
}
```

Click any track — the playback bar appears at the bottom of the viewport. Choose `ui="toast"` for a floating notification-style player instead.

> See the [`@tastify/react` playback docs](./packages/react/README.md#playback) for `usePlayback`, bar vs. toast, SDK mode, and more.

### Vanilla

```js
import { mount, mountPlaybackBar } from '@tastify/vanilla'

const bar = mountPlaybackBar()

mount('#tracks', {
  type: 'top-tracks',
  tokenUrl: '/api/spotify/token',
  onTrackPlay: (track) => bar.update(),
})
```

> See the [`@tastify/vanilla` playback docs](./packages/vanilla/README.md#playback) for toast mounts, embed vs. SDK, and configuration.

## Theming

### Theme mode

Both `@tastify/react` and `@tastify/vanilla` accept a `theme` value:

| Value | Behavior |
|---|---|
| `'light'` | Light surface/text colors (default) |
| `'dark'` | Dark surface/text colors |
| `'auto'` | Follows the visitor's `prefers-color-scheme` system setting |

In React, pass it to the provider:

```tsx
<TastifyProvider tokenUrl="/api/spotify/token" theme="auto">
```

In vanilla, set it per-widget or as a `data-tf-theme` attribute:

```html
<div data-tastify="now-playing" data-tf-theme="dark"></div>
```

```js
mount('#player', { type: 'now-playing', tokenUrl: '...', theme: 'dark' })
```

### CSS custom properties

Every component is styled with CSS custom properties, so you can restyle anything without touching JS. Override them on `.tastify-provider` (React) or `[data-tastify]` (vanilla):

```css
[data-tastify], .tastify-provider {
  --tf-color-bg: #0a0a0a;
  --tf-color-surface: #1a1a1a;
  --tf-color-text-primary: #ffffff;
  --tf-color-text-secondary: #a0a0a0;
  --tf-color-accent: #1db954;
  --tf-color-border: #2a2a2a;
  --tf-radius: 12px;
  --tf-art-size: 56px;
  --tf-font-family: 'Inter', system-ui, sans-serif;
  --tf-transition-speed: 200ms;
}
```

| Variable | Controls |
|---|---|
| `--tf-color-bg` | Page/widget background |
| `--tf-color-surface` | Card and container surfaces |
| `--tf-color-text-primary` | Track names, headings |
| `--tf-color-text-secondary` | Artist names, timestamps, secondary text |
| `--tf-color-accent` | Progress bars, active states, links |
| `--tf-color-border` | Card and divider borders |
| `--tf-radius` | Border radius on cards and artwork |
| `--tf-art-size` | Album/artist artwork dimensions |
| `--tf-font-family` | Font stack for all widget text |
| `--tf-transition-speed` | Animation/transition duration |

These variables cascade, so you can scope overrides to individual widgets or breakpoints:

```css
@media (max-width: 640px) {
  .tastify-provider {
    --tf-art-size: 40px;
    --tf-radius: 8px;
  }
}
```

## Headless Mode

Every component accepts a `children` render prop for full control over markup:

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

In vanilla JS, use the `mount()` function with `onTrackPlay` / `onArtistPlay` callbacks for equivalent control.

## Requirements

- A Spotify account (Premium **not** required for most features)
- A registered [Spotify Developer](https://developer.spotify.com/dashboard) application
- Node 18+ for the CLI and serverless functions
- React 18+ for `@tastify/react`

## Contributing

```bash
git clone https://github.com/cristobalwee/tastify.git
cd tastify
pnpm install
pnpm build
```

The monorepo uses [Turborepo](https://turbo.build/) + [pnpm workspaces](https://pnpm.io/workspaces). Individual packages live under `packages/` and can be built/tested independently with `pnpm --filter @tastify/core build`.

## License

[MIT](./LICENSE) — build something cool.
