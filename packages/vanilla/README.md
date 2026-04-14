# @tastify/vanilla

Vanilla JS Spotify widgets that work on **any** site, no framework or build step required. Includes data-attribute auto-init for zero-JS usage and a programmatic `mount()` API for full control. Ships with **playback bar and toast** components out of the box.

## Install

### npm

```bash
npm install @tastify/vanilla
```

### CDN (zero build)

```html
<link rel="stylesheet" href="https://unpkg.com/@tastify/vanilla/dist/styles.css" />
<script src="https://unpkg.com/@tastify/vanilla" data-tastify-token-url="/api/spotify/token"></script>
```

The script auto-initializes every `[data-tastify]` element on the page.

## Data Attributes (zero JS)

Drop elements into your HTML and they render automatically:

```html
<div data-tastify="now-playing"></div>
<div data-tastify="top-tracks" data-limit="5" data-layout="grid" data-columns="3"></div>
<div data-tastify="top-albums" data-limit="5" data-layout="grid" data-columns="3"></div>
<div data-tastify="top-artists" data-layout="grid" data-show-genres></div>
<div data-tastify="recently-played" data-limit="10" data-show-timestamp></div>
```

All `MountOptions` are available as `data-*` attributes in kebab-case. The `data-tastify-token-url` on the `<script>` tag is shared across all widgets.

## JavaScript API

### `mount(selector, options)`

```js
import { mount } from '@tastify/vanilla'
import '@tastify/vanilla/styles.css'

const widget = mount('#player', {
  type: 'now-playing',
  tokenUrl: '/api/spotify/token',
  showProgress: true,
  compact: false,
})

widget.update({ compact: true })
widget.destroy()
```

### MountOptions

| Option | Type | Default | Applies to |
|---|---|---|---|
| `type` | `'now-playing' \| 'top-tracks' \| 'top-albums' \| 'top-artists' \| 'recently-played'` | — | **Required** |
| `tokenUrl` | `string` | — | All |
| `getToken` | `() => Promise<string>` | — | All |
| `token` | `string` | — | All |
| `theme` | `'light' \| 'dark' \| 'auto'` | — | All |
| `compact` | `boolean` | `false` | NowPlaying |
| `showArt` | `boolean` | `true` | NowPlaying, TopTracks, TopAlbums |
| `showProgress` | `boolean` | `true` | NowPlaying |
| `interactive` | `boolean` | `true` | NowPlaying |
| `fallback` | `string` | — | NowPlaying |
| `pollInterval` | `number` | `15000` | NowPlaying |
| `timeRange` | `'short_term' \| 'medium_term' \| 'long_term'` | `'medium_term'` | TopTracks, TopAlbums, TopArtists |
| `limit` | `number` | `20` | TopTracks, TopAlbums, TopArtists, RecentlyPlayed |
| `layout` | `'list' \| 'grid' \| 'compact-grid'` | varies | TopTracks, TopAlbums, TopArtists, RecentlyPlayed |
| `showRank` | `boolean` | `true` | TopTracks, TopAlbums |
| `columns` | `number` | — | TopTracks, TopAlbums, TopArtists (grid) |
| `header` | `string \| null` | — | TopTracks, TopAlbums, TopArtists |
| `showTimeRangeSelector` | `boolean` | `false` | TopTracks, TopAlbums, TopArtists |
| `showGenres` | `boolean` | `false` | TopArtists |
| `showTimestamp` | `boolean` | `true` | RecentlyPlayed |
| `groupByDay` | `boolean` | `false` | RecentlyPlayed |
| `onTrackPlay` | `(track) => void` | — | NowPlaying (optional; default uses embed player), TopTracks, RecentlyPlayed |
| `onArtistPlay` | `(artist) => void` | — | TopArtists |

### MountedWidget

```ts
interface MountedWidget {
  update(opts: Partial<MountOptions>): void
  destroy(): void
}
```

## Playback

Play track previews directly on the page with `mountPlaybackBar` or `mountPlaybackToast`. Both default to the **Spotify Embed IFrame API**, which streams ~30-second previews with no authentication or Premium account required — any visitor can click play and hear music immediately.

### Playback Bar

Fixed bar at the bottom of the viewport:

```js
import { mount, mountPlaybackBar } from '@tastify/vanilla'
import '@tastify/vanilla/styles.css'

const bar = mountPlaybackBar()

mount('#tracks', {
  type: 'top-tracks',
  tokenUrl: '/api/spotify/token',
  onTrackPlay: (track) => bar.update(),
})
```

### Playback Toast

Floating notification-style player:

```js
import { mountPlaybackToast } from '@tastify/vanilla'

const toast = mountPlaybackToast({
  position: 'bottom-right', // 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
})
```

### Playback options

Both `mountPlaybackBar` and `mountPlaybackToast` accept:

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement` | auto-created `<div>` | Custom mount target |
| `embed` | `boolean` | `true` | Use Spotify Embed IFrame API |
| `sdk` | `SDKPlayerOptions` | — | Use Web Playback SDK (Premium) |

When `sdk` is provided and the connection fails (e.g. no Premium account), it falls back to embed mode automatically.

### PlaybackWidget

```ts
interface PlaybackWidget {
  update(opts?: Record<string, unknown>): void
  destroy(): void
}
```

### Web Playback SDK mode

SDK mode connects to the [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) and registers the browser as a **Spotify Connect device**, enabling full-length track playback. Be aware of the trade-offs:

- **Requires Spotify Premium** — free-tier accounts will trigger the `onPremiumRequired` callback.
- **Takes over the active device** — Spotify only streams to one device at a time. When SDK mode activates, playback transfers to the browser and stops on the visitor's phone/desktop app.
- The access token must include the `streaming` scope.

For public-facing sites, the default embed mode is almost always what you want. SDK mode is best for personal dashboards where you're the primary user.

```js
import { mountPlaybackBar } from '@tastify/vanilla'

const bar = mountPlaybackBar({
  embed: false,
  sdk: {
    getToken: () => fetch('/api/spotify/token').then(r => r.json()).then(d => d.access_token),
    deviceName: 'My Portfolio',
    volume: 0.5,
    onPremiumRequired: () => console.log('Premium needed for full playback'),
  },
})
```

## Theming

Override CSS custom properties on any widget container:

```css
[data-tastify] {
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

Use `theme: 'dark'` or `theme: 'auto'` in mount options, or `data-tf-theme="dark"` on individual elements.

## Related

- [`@tastify/core`](../core/README.md) — Underlying client + playback engine
- [`@tastify/react`](../react/README.md) — React components + hooks
- [Root README](../../README.md) — Full project overview
