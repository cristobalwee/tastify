'use client';

import { useState, type ReactNode } from 'react';
import type { TopAlbumsData, TimeRange } from '@tastify/core';
import { useTopAlbums } from '../hooks/useTopAlbums.js';
import { AlbumCard } from './AlbumCard.js';
import { TimeRangeSelector } from './TimeRangeSelector.js';

export interface TopAlbumsProps {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'list' | 'grid' | 'compact-grid';
  showRank?: boolean;
  showArt?: boolean;
  columns?: number;
  header?: string | null;
  showTimeRangeSelector?: boolean;
  className?: string;
  children?: (data: TopAlbumsData) => ReactNode;
}

export function TopAlbums({
  timeRange: timeRangeProp,
  limit = 5,
  layout = 'list',
  showRank = true,
  showArt = true,
  columns = 3,
  header = 'Top Albums',
  showTimeRangeSelector = false,
  className,
  children,
}: TopAlbumsProps) {
  const [internalRange, setInternalRange] = useState<TimeRange>(
    timeRangeProp ?? 'medium_term',
  );
  const timeRange = timeRangeProp ?? internalRange;
  const state = useTopAlbums({ timeRange, limit });

  const isLoading = state.status === 'loading' || state.status === 'idle';

  if (state.status === 'error') {
    return null;
  }

  const albums = state.status === 'success' ? state.data.albums : [];

  if (!isLoading && children && state.status === 'success') {
    return <>{children(state.data)}</>;
  }

  const cardCount = isLoading ? limit : albums.length;

  return (
    <div
      className={cls(
        `tf-top-tracks tf-top-tracks--${layout} tf-top-albums`,
        className,
      )}
    >
      {header !== null && <h3 className="tf-top-tracks__header">{header}</h3>}
      {showTimeRangeSelector && (
        <TimeRangeSelector
          value={timeRange}
          onChange={setInternalRange}
          isLoading={isLoading}
        />
      )}
      <div
        className="tf-top-tracks__list"
        style={
          layout !== 'list'
            ? { gridTemplateColumns: `repeat(${columns}, 1fr)` }
            : undefined
        }
      >
        {Array.from({ length: cardCount }, (_, i) => (
          <AlbumCard
            key={i}
            album={albums[i]}
            rank={layout !== 'grid' && showRank ? i + 1 : undefined}
            showRank={showRank}
            showArt={showArt}
            layout={layout}
          />
        ))}
      </div>
    </div>
  );
}

function cls(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}
