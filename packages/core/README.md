# @tastify/core

<a href="https://www.npmjs.com/package/@tastify/core"><img src="https://img.shields.io/npm/v/@tastify/core?color=1db954" alt="npm" /></a>

Low-level Spotify API client that powers all tastify widgets. Handles **token management**, **caching** (soft + hard TTL), **polling**, and a **multi-mode audio playback engine**. You probably want [`@tastify/react`](../react/README.md) or [`@tastify/vanilla`](../vanilla/README.md) instead — but if you're building your own UI, this is the right starting point.

## Install

```bash
npm install @tastify/core
```

## TastifyClient

```ts
import { TastifyClient } from '@tastify/core'

const client = new TastifyClient({
  tokenUrl: '/api/spotify/token',
})
```

### Configuration

Provide **one** of the following to authenticate:

| Option | Type | Description |
|---|---|---|
| `tokenUrl` | `string` | URL to your server-side token endpoint (recommended) |
| `getToken` | `() => Promise<string>` | Custom async token resolver |
| `token` | `string` | Static access token (short-lived, for testing) |

Optional: `cacheTTL` overrides the default soft TTL for all endpoints.

### Data methods

```ts
const nowPlaying = await client.getNowPlaying()
const topTracks  = await client.getTopTracks({ timeRange: 'short_term', limit: 10 })
const topArtists = await client.getTopArtists({ timeRange: 'long_term', limit: 5 })
const recent     = await client.getRecentlyPlayed({ limit: 20 })
const artistHits = await client.getArtistTopTracks('6eUKZXaKkcviH0Ku9w2n3V')
```

| Method | Returns | Notes |
|---|---|---|
| `getNowPlaying()` | `NowPlayingData \| null` | `null` when nothing is playing |
| `getTopTracks(opts?)` | `TopTracksData` | `timeRange`, `limit` |
| `getTopArtists(opts?)` | `TopArtistsData` | `timeRange`, `limit` |
| `getRecentlyPlayed(opts?)` | `RecentlyPlayedData` | `limit` |
| `getArtistTopTracks(id, opts?)` | `TastifyTrack[]` | Optional `market` |
| `getAccessToken()` | `string` | Resolves + caches the current token |

### Real-time polling

```ts
const unsubscribe = client.onNowPlayingChange((data) => {
  console.log('Now playing:', data?.track.name)
}, 15_000)

// Later
unsubscribe()
```

### Cleanup

```ts
client.destroy() // stops all pollers, clears cache
```

## Audio Playback Engine

The core ships a unified `AudioPlayer` interface with three backend modes:

| Factory | Mode | Requires |
|---|---|---|
| `getAudioPlayer()` | `'preview'` | Nothing — plays 30s preview URLs |
| `getOrCreateEmbedPlayer()` | `'embed'` | Nothing — uses Spotify IFrame API |
| `getOrCreateSDKPlayer(opts)` | `'sdk'` | Spotify Premium + access token with `streaming` scope |

**Embed** is the recommended default for public-facing sites — it streams ~30-second previews via Spotify's IFrame API with no login or Premium required from the visitor.

**SDK mode** uses the [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk), which registers the browser as a **Spotify Connect device** and enables full-length playback. The trade-off is that Spotify only streams to one device at a time — activating SDK mode in the browser pauses playback on the visitor's phone or desktop app (and vice versa). It also requires a Premium subscription; free-tier accounts will fail to connect. Best suited for personal dashboards where you're the primary listener, not public-facing portfolios.

All three return the same `AudioPlayer` API:

```ts
import { getAudioPlayer } from '@tastify/core'

const player = getAudioPlayer()

player.play(track)
player.pause()
player.resume()
player.togglePlayPause()
player.seek(0.5)          // seek to 50%
player.setQueue(tracks, 0) // play a list starting at index 0
player.next()
player.previous()
player.stop()
player.destroy()

const state = player.getState()
// { currentTrack, isPlaying, progress, duration, currentTime, playbackMode }

const unsub = player.subscribe('statechange', () => { /* re-render */ })
// Events: 'statechange' | 'trackchange' | 'ended'
```

Both `getOrCreateSDKPlayer` and `getOrCreateEmbedPlayer` fall back to the basic preview player automatically if their respective backends fail to initialize.

```ts
import { getOrCreateSDKPlayer } from '@tastify/core'

const player = await getOrCreateSDKPlayer({
  getToken: () => client.getAccessToken(),
  deviceName: 'My Portfolio',
  volume: 0.5,
  onPremiumRequired: () => console.log('Premium needed'),
})
```

### Preloading

Pre-warm the embed iframe so the first play is instant:

```ts
import { preloadEmbedPlayer } from '@tastify/core'

preloadEmbedPlayer()
```

## Utilities

| Export | Description |
|---|---|
| `createPoller(fn, intervalMs)` | Generic polling helper with `start()` / `stop()` |
| `loadSpotifySDK()` | Loads the Web Playback SDK script |
| `loadSpotifyEmbed()` | Loads the Spotify Embed API script |
| `resetAudioPlayer()` | Destroys + resets the singleton player |
| `TastifyError` | Typed error with HTTP status code |

## Types

All data types are exported for TypeScript consumers:

```ts
import type {
  TastifyTrack,
  TastifyArtist,
  TastifyAlbum,
  TastifyImage,
  NowPlayingData,
  TopTracksData,
  TopArtistsData,
  RecentlyPlayedData,
  TimeRange,        // 'short_term' | 'medium_term' | 'long_term'
  DataState,
  TastifyConfig,
  AudioPlayer,
  PlaybackState,
  PlaybackEvent,
  PlaybackMode,     // 'preview' | 'sdk' | 'embed'
  SDKPlayerOptions,
  Poller,
} from '@tastify/core'
```

## Related

- [`@tastify/react`](../react/README.md) — React components + hooks
- [`@tastify/vanilla`](../vanilla/README.md) — Framework-free widgets
- [Root README](../../README.md) — Full project overview
