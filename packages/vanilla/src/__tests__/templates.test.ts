import { describe, it, expect } from 'vitest';
import {
  renderNowPlayingSkeleton,
  populateNowPlaying,
  renderTopTracks,
  renderTopArtists,
  renderRecentlyPlayed,
} from '../templates.js';
import type {
  NowPlayingData,
  TopTracksData,
  TopArtistsData,
  RecentlyPlayedData,
  TastifyTrack,
  TastifyArtist,
} from '@tastify/core';

function makeTrack(overrides?: Partial<TastifyTrack>): TastifyTrack {
  return {
    id: 't1',
    uri: 'spotify:track:t1',
    name: 'Test Track',
    artists: [
      {
        id: 'a1',
        uri: 'spotify:artist:a1',
        name: 'Test Artist',
        images: [{ url: 'https://img/artist.jpg', width: 300, height: 300 }],
        genres: ['pop', 'rock'],
        externalUrl: 'https://open.spotify.com/artist/a1',
      },
    ],
    album: {
      id: 'al1',
      uri: 'spotify:album:al1',
      name: 'Test Album',
      images: [{ url: 'https://img/album.jpg', width: 300, height: 300 }],
      releaseDate: '2024-01-01',
      externalUrl: 'https://open.spotify.com/album/al1',
    },
    durationMs: 200_000,
    previewUrl: null,
    externalUrl: 'https://open.spotify.com/track/t1',
    explicit: false,
    ...overrides,
  };
}

function makeArtist(overrides?: Partial<TastifyArtist>): TastifyArtist {
  return {
    id: 'a1',
    uri: 'spotify:artist:a1',
    name: 'Test Artist',
    images: [{ url: 'https://img/artist.jpg', width: 300, height: 300 }],
    genres: ['pop', 'rock', 'indie', 'electronic'],
    externalUrl: 'https://open.spotify.com/artist/a1',
    ...overrides,
  };
}

function buildNowPlaying(data: NowPlayingData | null, opts: Parameters<typeof renderNowPlayingSkeleton>[0] & { fallback?: string } = {}) {
  const el = renderNowPlayingSkeleton(opts);
  populateNowPlaying(el, data, opts);
  return el;
}

describe('renderNowPlaying', () => {
  it('renders skeleton with correct structure', () => {
    const el = renderNowPlayingSkeleton({});
    expect(el.classList.contains('tf-now-playing')).toBe(true);
    expect(el.querySelector('.tf-now-playing__skeleton')).toBeTruthy();
    expect(el.querySelector('.tf-now-playing__content')).toBeTruthy();
    expect(el.querySelectorAll('.tf-skeleton').length).toBeGreaterThan(0);
  });

  it('renders idle state with fallback when data is null', () => {
    const el = buildNowPlaying(null, { fallback: '<p>Nothing playing</p>' });
    expect(el.classList.contains('tf-now-playing')).toBe(true);
    expect(el.classList.contains('tf-now-playing--idle')).toBe(true);
    expect(el.innerHTML).toContain('Nothing playing');
  });

  it('renders empty idle state when data is null and no fallback', () => {
    const el = buildNowPlaying(null, {});
    expect(el.classList.contains('tf-now-playing--idle')).toBe(true);
  });

  it('renders playing state with correct BEM classes', () => {
    const data: NowPlayingData = {
      isPlaying: true,
      track: makeTrack(),
      progressMs: 100_000,
      fetchedAt: Date.now(),
    };
    const el = buildNowPlaying(data, {});

    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('tf-now-playing')).toBe(true);
    expect(el.classList.contains('tf-now-playing--loaded')).toBe(true);
    expect(el.classList.contains('tf-now-playing--idle')).toBe(false);
    expect(el.querySelector('.tf-now-playing__header')!.textContent).toBe('Listening to');
    expect(el.querySelector('.tf-now-playing__art')).toBeTruthy();
    expect(el.querySelector('.tf-now-playing__track')!.textContent).toBe('Test Track');
    expect(el.querySelector('.tf-now-playing__artist')!.textContent).toBe('Test Artist');
    expect(el.querySelector('.tf-now-playing__link')).toBeTruthy();
  });

  it('renders compact mode with link content layer', () => {
    const data: NowPlayingData = {
      isPlaying: true,
      track: makeTrack(),
      progressMs: 50_000,
      fetchedAt: Date.now(),
    };
    const el = buildNowPlaying(data, { compact: true });

    const content = el.querySelector('.tf-now-playing__content')!;
    expect(content.tagName).toBe('A');
    expect(content.getAttribute('href')).toBe('https://open.spotify.com/track/t1');
    expect(el.classList.contains('tf-now-playing--compact')).toBe(true);
    expect(el.classList.contains('tf-now-playing--linked')).toBe(true);
    expect(el.querySelector('.tf-now-playing__track')!.textContent).toBe('Test Track');
  });

  it('omits the section header when showTitle is false (default layout only)', () => {
    const data: NowPlayingData = {
      isPlaying: true,
      track: makeTrack(),
      progressMs: 100_000,
      fetchedAt: Date.now(),
    };
    const el = buildNowPlaying(data, { showTitle: false });
    expect(el.querySelector('.tf-now-playing__header')).toBeNull();
    expect(el.querySelector('.tf-now-playing__track')).toBeTruthy();
  });

  it('renders compact mode with div content when showLink is false', () => {
    const data: NowPlayingData = {
      isPlaying: true,
      track: makeTrack(),
      progressMs: 50_000,
      fetchedAt: Date.now(),
    };
    const el = buildNowPlaying(data, { compact: true, showLink: false });

    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('tf-now-playing--compact')).toBe(true);
    const content = el.querySelector('.tf-now-playing__content')!;
    expect(content.tagName).toBe('DIV');
  });

  it('hides art when showArt=false', () => {
    const data: NowPlayingData = {
      isPlaying: true,
      track: makeTrack(),
      progressMs: 0,
      fetchedAt: Date.now(),
    };
    const el = buildNowPlaying(data, { showArt: false });
    expect(el.querySelector('.tf-now-playing__art')).toBeNull();
  });

  it('marks idle when not playing', () => {
    const data: NowPlayingData = {
      isPlaying: false,
      track: makeTrack(),
      progressMs: 0,
      fetchedAt: Date.now(),
    };
    const el = buildNowPlaying(data, {});
    expect(el.classList.contains('tf-now-playing--idle')).toBe(true);
  });

  it('crossfades skeleton to content when populated', () => {
    const el = renderNowPlayingSkeleton({});
    const skeleton = el.querySelector('.tf-now-playing__skeleton')!;
    expect(skeleton.getAttribute('aria-hidden')).toBeNull();
    expect(el.classList.contains('tf-now-playing--loaded')).toBe(false);

    const data: NowPlayingData = {
      isPlaying: true,
      track: makeTrack(),
      progressMs: 0,
      fetchedAt: Date.now(),
    };
    populateNowPlaying(el, data, {});

    expect(el.classList.contains('tf-now-playing--loaded')).toBe(true);
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.tf-now-playing__skeleton')).toBe(skeleton);
  });
});

describe('renderTopTracks', () => {
  const data: TopTracksData = {
    tracks: [makeTrack({ id: 't1', name: 'Track 1' }), makeTrack({ id: 't2', name: 'Track 2' })],
    timeRange: 'medium_term',
    fetchedAt: Date.now(),
  };

  it('renders list layout with correct BEM classes', () => {
    const el = renderTopTracks(data, { layout: 'list' });
    expect(el.classList.contains('tf-top-tracks')).toBe(true);
    expect(el.classList.contains('tf-top-tracks--list')).toBe(true);
    expect(el.querySelector('.tf-top-tracks__header')!.textContent).toBe('On Repeat');
    expect(el.querySelectorAll('.tf-track-card--list').length).toBe(2);
  });

  it('renders grid layout', () => {
    const el = renderTopTracks(data, { layout: 'grid', columns: 2 });
    expect(el.classList.contains('tf-top-tracks--grid')).toBe(true);
    expect(el.querySelectorAll('.tf-track-card--grid').length).toBe(2);
    const list = el.querySelector('.tf-top-tracks__list') as HTMLElement;
    expect(list.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
  });

  it('shows rank numbers in list mode when showRank=true', () => {
    const el = renderTopTracks(data, { layout: 'list', showRank: true });
    const ranks = el.querySelectorAll('.tf-track-card__rank');
    expect(ranks.length).toBe(2);
    expect(ranks[0]!.textContent).toBe('1');
    expect(ranks[1]!.textContent).toBe('2');
  });

  it('hides header when header=null', () => {
    const el = renderTopTracks(data, { header: null });
    expect(el.querySelector('.tf-top-tracks__header')).toBeNull();
  });

  it('renders time range selector', () => {
    const el = renderTopTracks(data, { showTimeRangeSelector: true });
    const buttons = el.querySelectorAll('.tf-time-range-selector__btn');
    expect(buttons.length).toBe(3);
    expect(
      el.querySelector('.tf-time-range-selector__btn--active')!.textContent,
    ).toBe('6 months');
  });
});

describe('renderTopArtists', () => {
  const data: TopArtistsData = {
    artists: [makeArtist({ id: 'a1', name: 'Artist 1' }), makeArtist({ id: 'a2', name: 'Artist 2' })],
    timeRange: 'medium_term',
    fetchedAt: Date.now(),
  };

  it('renders grid layout with correct BEM classes', () => {
    const el = renderTopArtists(data, { layout: 'grid' });
    expect(el.classList.contains('tf-top-artists')).toBe(true);
    expect(el.classList.contains('tf-top-artists--grid')).toBe(true);
    expect(el.querySelector('.tf-top-artists__header')!.textContent).toBe('Top Artists');
    expect(el.querySelectorAll('.tf-artist-card--grid').length).toBe(2);
  });

  it('renders list layout', () => {
    const el = renderTopArtists(data, { layout: 'list' });
    expect(el.classList.contains('tf-top-artists--list')).toBe(true);
    expect(el.querySelectorAll('.tf-artist-card--list').length).toBe(2);
  });

  it('shows genres when showGenres=true', () => {
    const el = renderTopArtists(data, { showGenres: true });
    expect(el.querySelectorAll('.tf-artist-card__genres').length).toBe(2);
    // Only 3 genres should be shown per artist
    const firstCard = el.querySelector('.tf-artist-card')!;
    expect(firstCard.querySelectorAll('.tf-artist-card__genre').length).toBe(3);
  });

  it('renders time range selector', () => {
    const el = renderTopArtists(data, { showTimeRangeSelector: true, timeRange: 'short_term' });
    expect(
      el.querySelector('.tf-time-range-selector__btn--active')!.textContent,
    ).toBe('4 weeks');
  });
});

describe('renderRecentlyPlayed', () => {
  const data: RecentlyPlayedData = {
    tracks: [
      { track: makeTrack({ id: 't1' }), playedAt: new Date(Date.now() - 120_000).toISOString() },
      { track: makeTrack({ id: 't2' }), playedAt: new Date(Date.now() - 3_600_000).toISOString() },
    ],
    fetchedAt: Date.now(),
  };

  it('renders list layout with correct BEM classes', () => {
    const el = renderRecentlyPlayed(data, { layout: 'list' });
    expect(el.classList.contains('tf-recently-played')).toBe(true);
    expect(el.classList.contains('tf-recently-played--list')).toBe(true);
    expect(el.querySelector('.tf-recently-played__header')!.textContent).toBe('Recently Played');
    expect(el.querySelectorAll('.tf-track-card').length).toBe(2);
  });

  it('renders grid layout', () => {
    const el = renderRecentlyPlayed(data, { layout: 'grid', columns: 2 });
    expect(el.classList.contains('tf-recently-played--grid')).toBe(true);
    const list = el.querySelector('.tf-recently-played__list') as HTMLElement;
    expect(list.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(el.querySelectorAll('.tf-track-card--grid').length).toBe(2);
  });

  it('renders compact-grid layout', () => {
    const el = renderRecentlyPlayed(data, { layout: 'compact-grid', columns: 3 });
    expect(el.classList.contains('tf-recently-played--compact-grid')).toBe(true);
    const list = el.querySelector('.tf-recently-played__list') as HTMLElement;
    expect(list.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    expect(el.querySelectorAll('.tf-track-card--compact-grid').length).toBe(2);
  });

  it('shows timestamps when showTimestamp=true', () => {
    const el = renderRecentlyPlayed(data, { showTimestamp: true });
    const times = el.querySelectorAll('.tf-recently-played__time');
    expect(times.length).toBe(2);
    expect(times[0]!.textContent).toBe('2m ago');
    expect(times[1]!.textContent).toBe('1h ago');
  });

  it('hides timestamps when showTimestamp=false', () => {
    const el = renderRecentlyPlayed(data, { showTimestamp: false });
    expect(el.querySelectorAll('.tf-recently-played__time').length).toBe(0);
  });

  it('groups by day when groupByDay=true', () => {
    const el = renderRecentlyPlayed(data, { groupByDay: true });
    expect(el.querySelectorAll('.tf-recently-played__group').length).toBeGreaterThan(0);
    expect(el.querySelector('.tf-recently-played__day')).toBeTruthy();
  });
});
