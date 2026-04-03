'use client';

import { createPortal } from 'react-dom';
import { usePlayback } from '../playback.js';
import { useTastifyTheme } from '../provider.js';
import { PlaybackBar } from './PlaybackBar.js';
import { PlaybackToast } from './PlaybackToast.js';

export function PlaybackOverlay() {
  const { config } = usePlayback();
  const theme = useTastifyTheme();

  const content =
    config.ui === 'toast' ? (
      <PlaybackToast position={config.toastPosition} />
    ) : (
      <PlaybackBar />
    );

  if (typeof document === 'undefined') return null;

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
