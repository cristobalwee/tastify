import type {
  NowPlayingData,
  TopTracksData,
  TopArtistsData,
  RecentlyPlayedData,
  TastifyTrack,
  TastifyArtist,
  TimeRange,
} from '@tastify/core';
import { h, setStyles } from './renderer.js';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: '4 weeks',
  medium_term: '6 months',
  long_term: 'All time',
};

export interface NowPlayingOptions {
  compact?: boolean;
  showArt?: boolean;
  showProgress?: boolean;
  showLink?: boolean;
  fallback?: string;
  pollInterval?: number;
}

export interface TopTracksOptions {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'list' | 'grid';
  showRank?: boolean;
  showArt?: boolean;
  columns?: number;
  header?: string | null;
  showTimeRangeSelector?: boolean;
}

export interface TopArtistsOptions {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'grid' | 'list';
  columns?: number;
  showGenres?: boolean;
  header?: string | null;
  showTimeRangeSelector?: boolean;
}

export interface RecentlyPlayedOptions {
  limit?: number;
  layout?: 'timeline' | 'list';
  showTimestamp?: boolean;
  groupByDay?: boolean;
  header?: string | null;
}

function createWaveform(): HTMLElement {
  return h('span', { class: 'tf-waveform' }, [
    h('span', { class: 'tf-waveform__bar' }),
    h('span', { class: 'tf-waveform__bar' }),
    h('span', { class: 'tf-waveform__bar' }),
    h('span', { class: 'tf-waveform__bar' }),
  ]);
}

function buildTrackCardSkeleton(layout: 'list' | 'grid', showRank?: boolean, showTimestamp?: boolean): HTMLElement {
  if (layout === 'grid') {
    return h('div', { class: 'tf-card__skeleton' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--art-grid' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:80%' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text-sm' }),
    ]);
  }
  const skChildren: (HTMLElement | Text)[] = [];
  if (showRank) {
    skChildren.push(h('div', { class: 'tf-skeleton tf-skeleton--rank' }));
  }
  skChildren.push(h('div', { class: 'tf-skeleton tf-skeleton--art' }));
  skChildren.push(
    h('div', { class: 'tf-track-card__info' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:70%' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text-sm' }),
    ]),
  );
  if (showTimestamp) {
    skChildren.push(h('div', { class: 'tf-skeleton tf-skeleton--text-sm', style: 'width:3em;flex-shrink:0' }));
  }
  return h('div', { class: 'tf-card__skeleton' }, skChildren);
}

function buildTrackCardContent(
  track: TastifyTrack,
  layout: 'list' | 'grid',
  opts: {
    rank?: number;
    showArt?: boolean;
    isPlaying?: boolean;
    isPaused?: boolean;
    timestamp?: string;
  },
): HTMLElement {
  const art = track.album.images[0]?.url;
  const artistNames = track.artists.map((a) => a.name).join(', ');
  const children: (HTMLElement | Text)[] = [];

  if (layout === 'grid') {
    if (opts.showArt !== false && art) {
      children.push(
        h('img', { class: 'tf-track-card__art', src: art, alt: track.album.name, loading: 'lazy' }),
      );
    }
    children.push(h('span', { class: 'tf-track-card__name' }, [track.name]));
    children.push(h('span', { class: 'tf-track-card__artist' }, [artistNames]));
    if (opts.isPlaying) {
      const waveform = createWaveform();
      if (opts.isPaused) waveform.classList.add('tf-waveform--paused');
      children.push(waveform);
    }
  } else {
    if (opts.rank != null) {
      children.push(h('span', { class: 'tf-track-card__rank' }, [String(opts.rank)]));
    }
    if (opts.showArt !== false && art) {
      children.push(
        h('img', { class: 'tf-track-card__art', src: art, alt: track.album.name, loading: 'lazy' }),
      );
    }
    children.push(
      h('div', { class: 'tf-track-card__info' }, [
        h('span', { class: 'tf-track-card__name' }, [track.name]),
        h('span', { class: 'tf-track-card__artist' }, [artistNames]),
      ]),
    );
    if (opts.isPlaying) {
      const waveform = createWaveform();
      if (opts.isPaused) waveform.classList.add('tf-waveform--paused');
      children.push(waveform);
    }
    if (opts.timestamp) {
      children.push(h('span', { class: 'tf-recently-played__time' }, [opts.timestamp]));
    }
  }

  return h('div', { class: 'tf-card__content' }, children);
}

export function renderTrackCard(
  track: TastifyTrack | undefined,
  layout: 'list' | 'grid',
  opts: {
    rank?: number;
    showRank?: boolean;
    showArt?: boolean;
    interactive?: boolean;
    onPlay?: (track: TastifyTrack) => void;
    isPlaying?: boolean;
    isPaused?: boolean;
    timestamp?: string;
    showTimestamp?: boolean;
  },
): HTMLElement {
  const loaded = !!track;
  const interactive = opts.interactive !== false;
  const playable = loaded && interactive && !!opts.onPlay;

  const cardClasses = [
    'tf-track-card',
    `tf-track-card--${layout}`,
    loaded && 'tf-track-card--loaded',
    playable && 'tf-track-card--playable',
    opts.isPlaying && 'tf-track-card--playing',
  ].filter(Boolean).join(' ');

  const skeletonLayer = buildTrackCardSkeleton(layout, opts.showRank, opts.showTimestamp);
  if (loaded) skeletonLayer.setAttribute('aria-hidden', 'true');

  const contentLayer = track
    ? buildTrackCardContent(track, layout, opts)
    : h('div', { class: 'tf-card__content' });

  const el = h('div', { class: cardClasses }, [skeletonLayer, contentLayer]);

  if (playable && opts.onPlay && track) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    const onPlay = opts.onPlay;
    el.addEventListener('click', () => onPlay(track));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPlay(track);
      }
    });
  }

  return el;
}

export function populateTrackCard(
  card: HTMLElement,
  track: TastifyTrack,
  opts: {
    rank?: number;
    showArt?: boolean;
    onPlay?: (track: TastifyTrack) => void;
    isPlaying?: boolean;
    isPaused?: boolean;
  },
): void {
  const layout = card.classList.contains('tf-track-card--grid') ? 'grid' : 'list';
  const oldContent = card.querySelector('.tf-card__content');
  if (!oldContent) return;

  const newContent = buildTrackCardContent(track, layout as 'list' | 'grid', opts);
  oldContent.replaceWith(newContent);

  card.classList.add('tf-track-card--loaded');

  const skeletonLayer = card.querySelector('.tf-card__skeleton');
  if (skeletonLayer) skeletonLayer.setAttribute('aria-hidden', 'true');

  if (opts.onPlay) {
    card.classList.add('tf-track-card--playable');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    const onPlay = opts.onPlay;
    card.addEventListener('click', () => onPlay(track));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPlay(track);
      }
    });
  }

  if (opts.isPlaying) card.classList.add('tf-track-card--playing');
}

export function renderTrackCardSkeleton(layout: 'list' | 'grid', showRank?: boolean): HTMLElement {
  return renderTrackCard(undefined, layout, { showRank });
}

function buildArtistCardSkeleton(layout: 'grid' | 'list'): HTMLElement {
  if (layout === 'grid') {
    return h('div', { class: 'tf-card__skeleton' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--photo-circle' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:70%' }),
    ]);
  }
  return h('div', { class: 'tf-card__skeleton' }, [
    h('div', { class: 'tf-skeleton tf-skeleton--art tf-skeleton--circle' }),
    h('div', { class: 'tf-artist-card__info' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:60%' }),
    ]),
  ]);
}

function buildArtistCardContent(
  artist: TastifyArtist,
  layout: 'grid' | 'list',
  showGenres: boolean,
): HTMLElement {
  const photo = artist.images[0]?.url;
  const children: (HTMLElement | Text)[] = [];

  function genresEl(): HTMLElement | null {
    if (!showGenres || artist.genres.length === 0) return null;
    return h(
      'div',
      { class: 'tf-artist-card__genres' },
      artist.genres.slice(0, 3).map((g) => h('span', { class: 'tf-artist-card__genre' }, [g])),
    );
  }

  if (layout === 'grid') {
    if (photo) {
      children.push(
        h('img', { class: 'tf-artist-card__photo', src: photo, alt: artist.name, loading: 'lazy' }),
      );
    }
    children.push(h('span', { class: 'tf-artist-card__name' }, [artist.name]));
    const genres = genresEl();
    if (genres) children.push(genres);
  } else {
    if (photo) {
      children.push(
        h('img', { class: 'tf-artist-card__photo', src: photo, alt: artist.name, loading: 'lazy' }),
      );
    }
    const infoChildren: (HTMLElement | Text)[] = [
      h('span', { class: 'tf-artist-card__name' }, [artist.name]),
    ];
    const genres = genresEl();
    if (genres) infoChildren.push(genres);
    children.push(h('div', { class: 'tf-artist-card__info' }, infoChildren));
  }

  return h('div', { class: 'tf-card__content' }, children);
}

export function renderArtistCard(
  artist: TastifyArtist | undefined,
  layout: 'grid' | 'list',
  showGenres: boolean,
  onPlay?: (artist: TastifyArtist) => void,
): HTMLElement {
  const loaded = !!artist;
  const playable = loaded && !!onPlay;

  const cardClasses = [
    'tf-artist-card',
    `tf-artist-card--${layout}`,
    loaded && 'tf-artist-card--loaded',
    playable && 'tf-artist-card--playable',
  ].filter(Boolean).join(' ');

  const skeletonLayer = buildArtistCardSkeleton(layout);
  if (loaded) skeletonLayer.setAttribute('aria-hidden', 'true');

  const contentLayer = artist
    ? buildArtistCardContent(artist, layout, showGenres)
    : h('div', { class: 'tf-card__content' });

  const el = h('div', { class: cardClasses }, [skeletonLayer, contentLayer]);

  if (playable && onPlay && artist) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    const handler = onPlay;
    el.addEventListener('click', () => handler(artist));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler(artist);
      }
    });
  }

  return el;
}

export function populateArtistCard(
  card: HTMLElement,
  artist: TastifyArtist,
  showGenres: boolean,
  onPlay?: (artist: TastifyArtist) => void,
): void {
  const layout = card.classList.contains('tf-artist-card--grid') ? 'grid' : 'list';
  const oldContent = card.querySelector('.tf-card__content');
  if (!oldContent) return;

  const newContent = buildArtistCardContent(artist, layout as 'grid' | 'list', showGenres);
  oldContent.replaceWith(newContent);

  card.classList.add('tf-artist-card--loaded');

  const skeletonLayer = card.querySelector('.tf-card__skeleton');
  if (skeletonLayer) skeletonLayer.setAttribute('aria-hidden', 'true');

  if (onPlay) {
    card.classList.add('tf-artist-card--playable');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    const handler = onPlay;
    card.addEventListener('click', () => handler(artist));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler(artist);
      }
    });
  }
}

function renderArtistCardSkeleton(layout: 'grid' | 'list'): HTMLElement {
  return renderArtistCard(undefined, layout, false);
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDayKey(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function renderTimeRangeSelectorSkeleton(): HTMLElement {
  return h('div', { class: 'tf-time-range-selector' }, [
    h('div', { class: 'tf-skeleton tf-skeleton--selector-btn' }),
    h('div', { class: 'tf-skeleton tf-skeleton--selector-btn' }),
    h('div', { class: 'tf-skeleton tf-skeleton--selector-btn' }),
  ]);
}

export function renderTimeRangeSelector(
  activeRange: TimeRange,
  onTimeRangeChange?: (range: TimeRange) => void,
): HTMLElement {
  const buttons = (Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => {
    const isActive = activeRange === range;
    const btn = h(
      'button',
      {
        class: `tf-time-range-selector__btn${isActive ? ' tf-time-range-selector__btn--active' : ''}`,
      },
      [TIME_RANGE_LABELS[range]],
    );
    btn.addEventListener('click', () => onTimeRangeChange?.(range));
    return btn;
  });
  return h('div', { class: 'tf-time-range-selector' }, buttons);
}

export function renderNowPlayingSkeleton(opts: NowPlayingOptions): HTMLElement {
  return h('div', { class: 'tf-now-playing tf-now-playing--loading' }, [
    h('div', { class: 'tf-skeleton tf-skeleton--art' }),
    h('div', { class: 'tf-now-playing__info' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:60%' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text-sm' }),
    ]),
  ]);
}

export function renderNowPlaying(
  data: NowPlayingData | null,
  opts: NowPlayingOptions,
): HTMLElement {
  const {
    compact = false,
    showArt = true,
    showProgress = true,
    showLink = true,
    fallback,
  } = opts;

  if (!data) {
    const el = h('div', { class: 'tf-now-playing tf-now-playing--idle' });
    if (fallback) {
      el.innerHTML = fallback;
    }
    return el;
  }

  const { track, isPlaying, progressMs } = data;
  const art = track.album.images[0]?.url;
  const progressPct = track.durationMs > 0 ? (progressMs / track.durationMs) * 100 : 0;
  const artistNames = track.artists.map((a) => a.name).join(', ');

  const classes = ['tf-now-playing'];
  if (compact) classes.push('tf-now-playing--compact');
  if (!isPlaying) classes.push('tf-now-playing--idle');

  const children: (HTMLElement | Text)[] = [];

  if (showArt && art) {
    children.push(
      h('img', {
        class: 'tf-now-playing__art',
        src: art,
        alt: track.album.name,
        loading: 'lazy',
      }),
    );
  }

  children.push(
    h('div', { class: 'tf-now-playing__info' }, [
      h('span', { class: 'tf-now-playing__track' }, [track.name]),
      h('span', { class: 'tf-now-playing__artist' }, [artistNames]),
    ]),
  );

  if (showProgress && !compact) {
    const bar = h('div', { class: 'tf-now-playing__progress-bar' });
    setStyles(bar, { width: `${progressPct}%` });
    children.push(h('div', { class: 'tf-now-playing__progress' }, [bar]));
  }

  if (isPlaying) {
    children.push(h('span', { class: 'tf-now-playing__pulse' }));
  }

  if (showLink) {
    children.push(
      h('a', {
        class: 'tf-now-playing__link',
        href: track.externalUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, ['Open in Spotify']),
    );
  }

  return h('div', { class: classes.join(' ') }, children);
}

export function renderTopTracksSkeleton(opts: TopTracksOptions): HTMLElement {
  const {
    layout = 'list',
    columns = 3,
    limit = 5,
    header = 'On Repeat',
    showRank = true,
    showTimeRangeSelector = false,
  } = opts;

  const children: (HTMLElement | Text)[] = [];
  if (header !== null) {
    children.push(h('h3', { class: 'tf-top-tracks__header' }, [header]));
  }

  if (showTimeRangeSelector) {
    children.push(renderTimeRangeSelectorSkeleton());
  }

  const listEl = h(
    'div',
    { class: 'tf-top-tracks__list' },
    Array.from({ length: limit }, () => renderTrackCardSkeleton(layout, showRank)),
  );

  if (layout === 'grid') {
    setStyles(listEl, { 'grid-template-columns': `repeat(${columns}, 1fr)` });
  }

  children.push(listEl);
  return h('div', { class: `tf-top-tracks tf-top-tracks--${layout}` }, children);
}

export function renderTopTracks(
  data: TopTracksData,
  opts: TopTracksOptions,
  onTimeRangeChange?: (range: TimeRange) => void,
): HTMLElement {
  const {
    timeRange,
    layout = 'list',
    showRank = true,
    showArt = true,
    columns = 3,
    header = 'On Repeat',
    showTimeRangeSelector = false,
  } = opts;

  const children: (HTMLElement | Text)[] = [];

  if (header !== null) {
    children.push(h('h3', { class: 'tf-top-tracks__header' }, [header]));
  }

  if (showTimeRangeSelector) {
    children.push(renderTimeRangeSelector(timeRange ?? 'medium_term', onTimeRangeChange));
  }

  const listEl = h(
    'div',
    { class: 'tf-top-tracks__list' },
    data.tracks.map((track, i) =>
      renderTrackCard(track, layout, {
        rank: layout === 'list' && showRank ? i + 1 : undefined,
        showArt,
      }),
    ),
  );

  if (layout === 'grid') {
    setStyles(listEl, { 'grid-template-columns': `repeat(${columns}, 1fr)` });
  }

  children.push(listEl);

  return h('div', { class: `tf-top-tracks tf-top-tracks--${layout}` }, children);
}

export function renderTopArtistsSkeleton(opts: TopArtistsOptions): HTMLElement {
  const {
    layout = 'grid',
    columns = 3,
    limit = 6,
    header = 'Top Artists',
    showTimeRangeSelector = false,
  } = opts;

  const children: (HTMLElement | Text)[] = [];
  if (header !== null) {
    children.push(h('h3', { class: 'tf-top-artists__header' }, [header]));
  }

  if (showTimeRangeSelector) {
    children.push(renderTimeRangeSelectorSkeleton());
  }

  const listEl = h(
    'div',
    { class: 'tf-top-artists__list' },
    Array.from({ length: limit }, () => renderArtistCardSkeleton(layout)),
  );

  if (layout === 'grid') {
    setStyles(listEl, { 'grid-template-columns': `repeat(${columns}, 1fr)` });
  }

  children.push(listEl);
  return h('div', { class: `tf-top-artists tf-top-artists--${layout}` }, children);
}

export function renderTopArtists(
  data: TopArtistsData,
  opts: TopArtistsOptions,
  onTimeRangeChange?: (range: TimeRange) => void,
): HTMLElement {
  const {
    timeRange,
    layout = 'grid',
    columns = 3,
    showGenres = false,
    header = 'Top Artists',
    showTimeRangeSelector = false,
  } = opts;

  const children: (HTMLElement | Text)[] = [];

  if (header !== null) {
    children.push(h('h3', { class: 'tf-top-artists__header' }, [header]));
  }

  if (showTimeRangeSelector) {
    children.push(renderTimeRangeSelector(timeRange ?? 'medium_term', onTimeRangeChange));
  }

  const listEl = h(
    'div',
    { class: 'tf-top-artists__list' },
    data.artists.map((artist) => renderArtistCard(artist, layout, showGenres)),
  );

  if (layout === 'grid') {
    setStyles(listEl, { 'grid-template-columns': `repeat(${columns}, 1fr)` });
  }

  children.push(listEl);

  return h('div', { class: `tf-top-artists tf-top-artists--${layout}` }, children);
}

export function renderRecentlyPlayedSkeleton(opts: RecentlyPlayedOptions): HTMLElement {
  const {
    layout = 'list',
    limit = 10,
    header = 'Recently Played',
    showTimestamp = true,
  } = opts;

  const children: (HTMLElement | Text)[] = [];
  if (header !== null) {
    children.push(h('h3', { class: 'tf-recently-played__header' }, [header]));
  }

  const itemEls = Array.from({ length: Math.min(limit, 5) }, () =>
    renderTrackCard(undefined, 'list', { showTimestamp }),
  );

  children.push(h('div', { class: 'tf-recently-played__list' }, itemEls));
  return h('div', { class: `tf-recently-played tf-recently-played--${layout}` }, children);
}

function renderRecentlyPlayedItem(
  track: TastifyTrack,
  playedAt: string,
  showTimestamp: boolean,
  onPlay?: (track: TastifyTrack) => void,
): HTMLElement {
  return renderTrackCard(track, 'list', {
    showArt: true,
    onPlay,
    showTimestamp,
    timestamp: showTimestamp ? formatRelativeTime(playedAt) : undefined,
  });
}

export function renderRecentlyPlayed(
  data: RecentlyPlayedData,
  opts: RecentlyPlayedOptions,
  onPlay?: (track: TastifyTrack) => void,
): HTMLElement {
  const {
    layout = 'list',
    showTimestamp = true,
    groupByDay = false,
    header = 'Recently Played',
  } = opts;

  const children: (HTMLElement | Text)[] = [];

  if (header !== null) {
    children.push(h('h3', { class: 'tf-recently-played__header' }, [header]));
  }

  const items = data.tracks;

  if (groupByDay) {
    const grouped = new Map<string, typeof items>();
    for (const item of items) {
      const key = getDayKey(item.playedAt);
      const existing = grouped.get(key);
      if (existing) {
        existing.push(item);
      } else {
        grouped.set(key, [item]);
      }
    }

    for (const [day, dayItems] of grouped) {
      const itemEls = dayItems.map((item) =>
        renderRecentlyPlayedItem(item.track, item.playedAt, showTimestamp, onPlay),
      );

      children.push(
        h('div', { class: 'tf-recently-played__group' }, [
          h('h4', { class: 'tf-recently-played__day' }, [day]),
          h('div', { class: 'tf-recently-played__list' }, itemEls),
        ]),
      );
    }
  } else {
    const itemEls = items.map((item) =>
      renderRecentlyPlayedItem(item.track, item.playedAt, showTimestamp, onPlay),
    );

    children.push(h('div', { class: 'tf-recently-played__list' }, itemEls));
  }

  return h('div', { class: `tf-recently-played tf-recently-played--${layout}` }, children);
}
