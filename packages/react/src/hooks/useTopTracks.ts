'use client';

import { useState, useEffect } from 'react';
import type { TopTracksData, DataState, TimeRange } from '@tastify/core';
import { TastifyError } from '@tastify/core';
import { useTastifyClient } from '../provider.js';

export function useTopTracks(opts?: {
  timeRange?: TimeRange;
  limit?: number;
}): DataState<TopTracksData> {
  const client = useTastifyClient();
  const timeRange = opts?.timeRange ?? 'medium_term';
  const limit = opts?.limit ?? 10;
  const [state, setState] = useState<DataState<TopTracksData>>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    client
      .getTopTracks({ timeRange, limit })
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            status: 'error',
            error:
              err instanceof TastifyError
                ? err
                : new TastifyError(String(err), 0),
          });
      });

    return () => {
      cancelled = true;
    };
  }, [client, timeRange, limit]);

  return state;
}
