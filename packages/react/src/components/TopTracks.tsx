'use client';

import { useState, type ReactNode } from 'react';
import type { TopTracksData, TimeRange } from '@tastify/core';
import { useTopTracks } from '../hooks/useTopTracks.js';
import { TrackCard } from './TrackCard.js';
import { TimeRangeSelector } from './TimeRangeSelector.js';

export interface TopTracksProps {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'list' | 'grid';
  showRank?: boolean;
  showArt?: boolean;
  columns?: number;
  header?: string | null;
  showTimeRangeSelector?: boolean;
  className?: string;
  children?: (data: TopTracksData) => ReactNode;
}

export function TopTracks({
  timeRange: timeRangeProp,
  limit = 5,
  layout = 'list',
  showRank = true,
  showArt = true,
  columns = 3,
  header = 'On Repeat',
  showTimeRangeSelector = false,
  className,
  children,
}: TopTracksProps) {
  const [internalRange, setInternalRange] = useState<TimeRange>(
    timeRangeProp ?? 'medium_term',
  );
  const timeRange = timeRangeProp ?? internalRange;
  const state = useTopTracks({ timeRange, limit });

  const isLoading = state.status === 'loading' || state.status === 'idle';

  if (state.status === 'error') {
    return null;
  }

  const tracks = state.status === 'success' ? state.data.tracks : [];

  if (!isLoading && children && state.status === 'success') {
    return <>{children(state.data)}</>;
  }

  const cardCount = isLoading ? limit : tracks.length;

  return (
    <div className={cls(`tf-top-tracks tf-top-tracks--${layout}`, className)}>
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
          layout === 'grid'
            ? { gridTemplateColumns: `repeat(${columns}, 1fr)` }
            : undefined
        }
      >
        {Array.from({ length: cardCount }, (_, i) => (
          <TrackCard
            key={i}
            track={tracks[i]}
            rank={layout === 'list' && showRank ? i + 1 : undefined}
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
