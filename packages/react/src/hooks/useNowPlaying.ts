'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NowPlayingData, DataState } from '@tastify/core';
import { TastifyError, nowPlayingFromRecentTrack } from '@tastify/core';
import { useTastifyClient } from '../provider.js';

export function useNowPlaying(opts?: {
  pollInterval?: number;
  /** When true and nothing is live, resolve data from the most recent track (presented like playing). */
  fallbackToRecent?: boolean;
}): DataState<NowPlayingData | null> {
  const client = useTastifyClient();
  const pollInterval = opts?.pollInterval ?? 15_000;
  const fallbackToRecent = opts?.fallbackToRecent ?? false;
  const [state, setState] = useState<DataState<NowPlayingData | null>>({
    status: 'loading',
  });

  const resolveNowPlaying = useCallback(
    async (data: NowPlayingData | null): Promise<NowPlayingData | null> => {
      if (data || !fallbackToRecent) return data;
      try {
        const recent = await client.getRecentlyPlayed({ limit: 1 });
        const first = recent.tracks[0];
        return first ? nowPlayingFromRecentTrack(first.track) : null;
      } catch {
        return null;
      }
    },
    [client, fallbackToRecent],
  );

  const fetchData = useCallback(async () => {
    try {
      const raw = await client.getNowPlaying();
      const data = await resolveNowPlaying(raw);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error:
          err instanceof TastifyError
            ? err
            : new TastifyError(String(err), 0),
      });
    }
  }, [client, resolveNowPlaying]);

  useEffect(() => {
    fetchData();

    if (pollInterval > 0) {
      const unsub = client.onNowPlayingChange((raw) => {
        void resolveNowPlaying(raw).then((data) => {
          setState({ status: 'success', data });
        });
      }, pollInterval);
      return unsub;
    }
  }, [client, pollInterval, fetchData, resolveNowPlaying]);

  return state;
}
