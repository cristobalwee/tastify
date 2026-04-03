import { describe, it, expect } from 'vitest';
import { nowPlayingFromRecentTrack } from '../now-playing-utils.js';
import type { TastifyTrack } from '../types.js';

const track: TastifyTrack = {
  id: 't1',
  uri: 'spotify:track:t1',
  name: 'Last',
  artists: [
    {
      id: 'a1',
      uri: 'spotify:artist:a1',
      name: 'Artist',
      images: [],
      genres: [],
      externalUrl: 'https://open.spotify.com/artist/a1',
    },
  ],
  album: {
    id: 'al1',
    uri: 'spotify:album:al1',
    name: 'Album',
    images: [],
    releaseDate: '2024-01-01',
    externalUrl: 'https://open.spotify.com/album/al1',
  },
  durationMs: 180_000,
  previewUrl: null,
  externalUrl: 'https://open.spotify.com/track/t1',
  explicit: false,
};

describe('nowPlayingFromRecentTrack', () => {
  it('returns playing-styled now-playing payload for a track', () => {
    const np = nowPlayingFromRecentTrack(track);
    expect(np.isPlaying).toBe(true);
    expect(np.track).toBe(track);
    expect(np.progressMs).toBe(0);
    expect(typeof np.fetchedAt).toBe('number');
  });
});
