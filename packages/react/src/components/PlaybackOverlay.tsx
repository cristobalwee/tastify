'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlayback } from '../playback.js';
import { useTastifyTheme } from '../provider.js';
import { PlaybackBar } from './PlaybackBar.js';
import { PlaybackToast } from './PlaybackToast.js';

export function PlaybackOverlay() {
  const { config } = usePlayback();
  const theme = useTastifyTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const content =
    config.ui === 'toast' ? (
      <PlaybackToast position={config.toastPosition} />
    ) : (
      <PlaybackBar />
    );

  const themeAttr = theme && theme !== 'light' ? theme : undefined;

  return createPortal(
    themeAttr ? (
      <div data-tf-theme={themeAttr} style={{ display: 'contents' }}>
        {content}
      </div>
    ) : (
      content
    ),
    document.body,
  );
}
