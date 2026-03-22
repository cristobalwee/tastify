'use client';

import { useState, useEffect } from 'react';
import type { RecentlyPlayedData, DataState } from '@tastify/core';
import { TastifyError } from '@tastify/core';
import { useTastifyClient } from '../provider.js';

export function useRecentlyPlayed(opts?: {
  limit?: number;
}): DataState<RecentlyPlayedData> {
  const client = useTastifyClient();
  const limit = opts?.limit ?? 20;
  const [state, setState] = useState<DataState<RecentlyPlayedData>>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    client
      .getRecentlyPlayed({ limit })
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
  }, [client, limit]);

  return state;
}
