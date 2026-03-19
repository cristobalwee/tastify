import { NowPlaying, TopTracks, TopArtists } from '@tastify/react'

export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>My Music</h1>
      <NowPlaying />
      <div style={{ marginTop: '2rem' }}>
        <TopTracks limit={5} />
      </div>
      <div style={{ marginTop: '2rem' }}>
        <TopArtists limit={5} layout="grid" columns={3} />
      </div>
    </main>
  )
}
