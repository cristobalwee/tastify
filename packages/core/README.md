# @tastify/core

Lightweight Spotify API client for tastify widgets. Handles token management, caching, and polling.

## Install

```bash
npm install @tastify/core
```

## Usage

```ts
import { TastifyClient } from '@tastify/core'

const client = new TastifyClient({
  tokenUrl: '/api/spotify/token',
})

const nowPlaying = await client.getNowPlaying()
const topTracks = await client.getTopTracks({ timeRange: 'short_term', limit: 10 })
const topArtists = await client.getTopArtists({ limit: 5 })
const recent = await client.getRecentlyPlayed({ limit: 20 })

// Subscribe to track changes
const unsubscribe = client.onNowPlayingChange((data) => {
  console.log('Now playing:', data?.track.name)
}, 15000)
```

You probably don't need this package directly — use [`@tastify/react`](https://github.com/your-repo/tastify) or [`@tastify/vanilla`](https://github.com/your-repo/tastify) instead.

See the [monorepo README](https://github.com/your-repo/tastify) for full documentation.
