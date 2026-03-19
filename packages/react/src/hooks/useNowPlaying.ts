import { useState, useEffect, useCallback } from 'react';
import type { NowPlayingData, DataState } from '@tastify/core';
import { TastifyError } from '@tastify/core';
import { useTastifyClient } from '../provider.js';

export function useNowPlaying(opts?: {
  pollInterval?: number;
}): DataState<NowPlayingData | null> {
  const client = useTastifyClient();
  const pollInterval = opts?.pollInterval ?? 15_000;
  const [state, setState] = useState<DataState<NowPlayingData | null>>({
    status: 'loading',
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await client.getNowPlaying();
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
  }, [client]);

  useEffect(() => {
    fetchData();

    if (pollInterval > 0) {
      const unsub = client.onNowPlayingChange((data) => {
        setState({ status: 'success', data });
      }, pollInterval);
      return unsub;
    }
  }, [client, pollInterval, fetchData]);

  return state;
}
