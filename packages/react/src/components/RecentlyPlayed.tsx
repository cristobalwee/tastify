'use client';

import { type ReactNode } from 'react';
import type { RecentlyPlayedData } from '@tastify/core';
import { useRecentlyPlayed } from '../hooks/useRecentlyPlayed.js';
import { TrackCard } from './TrackCard.js';

export interface RecentlyPlayedProps {
  limit?: number;
  layout?: 'list' | 'grid' | 'compact-grid';
  showTimestamp?: boolean;
  groupByDay?: boolean;
  columns?: number;
  header?: string | null;
  className?: string;
  children?: (data: RecentlyPlayedData) => ReactNode;
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

export function RecentlyPlayed({
  limit = 10,
  layout = 'list',
  showTimestamp = true,
  groupByDay = false,
  columns = 3,
  header = 'Recently Played',
  className,
  children,
}: RecentlyPlayedProps) {
  const state = useRecentlyPlayed({ limit });

  const isLoading = state.status === 'loading' || state.status === 'idle';

  if (state.status === 'error') {
    return null;
  }

  const items = state.status === 'success' ? state.data.tracks : [];

  if (!isLoading && children && state.status === 'success') {
    return <>{children(state.data)}</>;
  }

  const itemCount = isLoading ? limit : items.length;

  let grouped: Map<string, typeof items> | null = null;
  if (!isLoading && groupByDay) {
    grouped = new Map();
    for (const item of items) {
      const key = getDayKey(item.playedAt);
      const existing = grouped.get(key);
      if (existing) {
        existing.push(item);
      } else {
        grouped.set(key, [item]);
      }
    }
  }

  const cardLayout = layout === 'grid' ? 'grid' : layout === 'compact-grid' ? 'compact-grid' : 'list';
  const gridStyle = layout !== 'list'
    ? { gridTemplateColumns: `repeat(${columns}, 1fr)` }
    : undefined;

  return (
    <div
      className={cls(
        `tf-recently-played tf-recently-played--${layout}`,
        className,
      )}
    >
      {header !== null && (
        <h3 className="tf-recently-played__header">{header}</h3>
      )}
      {grouped
        ? Array.from(grouped.entries()).map(([day, dayItems]) => (
            <div key={day} className="tf-recently-played__group">
              <h4 className="tf-recently-played__day">{day}</h4>
              <div className="tf-recently-played__list" style={gridStyle}>
                {dayItems.map((item, i) => (
                  <TrackCard
                    key={i}
                    track={item.track}
                    showArt
                    layout={cardLayout}
                    showTimestamp={showTimestamp}
                    timestamp={formatRelativeTime(item.playedAt)}
                  />
                ))}
              </div>
            </div>
          ))
        : (
            <div className="tf-recently-played__list" style={gridStyle}>
              {Array.from({ length: itemCount }, (_, i) => (
                <TrackCard
                  key={i}
                  track={items[i]?.track}
                  showArt
                  layout={cardLayout}
                  showTimestamp={showTimestamp}
                  timestamp={items[i]?.playedAt ? formatRelativeTime(items[i].playedAt) : undefined}
                />
              ))}
            </div>
          )}
    </div>
  );
}

function cls(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}
