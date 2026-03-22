'use client';

import { createPortal } from 'react-dom';
import { usePlayback } from '../playback.js';
import { PlaybackBar } from './PlaybackBar.js';
import { PlaybackToast } from './PlaybackToast.js';

export function PlaybackOverlay() {
  const { config } = usePlayback();

  const content =
    config.ui === 'toast' ? (
      <PlaybackToast position={config.toastPosition} />
    ) : (
      <PlaybackBar />
    );

  if (typeof document === 'undefined') return null;

  return createPortal(content, document.body);
}
