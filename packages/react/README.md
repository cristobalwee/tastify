# @tastify/react

React components for displaying Spotify listening data on your site.

## Install

```bash
npm install @tastify/react
```

## Usage

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

All components support a headless render-prop pattern:

```tsx
<NowPlaying>
  {(data) => <p>Listening to {data.track.name}</p>}
</NowPlaying>
```

See the [monorepo README](https://github.com/your-repo/tastify) for full documentation.
