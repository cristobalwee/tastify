'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayback } from '../playback.js';
import type { ToastPosition } from '../playback.js';

export interface PlaybackToastProps {
  position?: ToastPosition;
}

export function PlaybackToast({ position: positionProp }: PlaybackToastProps) {
  const { state, config, togglePlayPause, next, previous, stop } =
    usePlayback();
  const position = positionProp ?? config.toastPosition ?? 'bottom-right';
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastTrackRef = useRef(state.currentTrack);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const prevTrackIdRef = useRef<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (state.currentTrack) {
    lastTrackRef.current = state.currentTrack;
  }

  useEffect(() => {
    if (state.currentTrack) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [state.currentTrack]);

  useEffect(() => {
    const changed = state.currentTrack?.id !== prevTrackIdRef.current;
    prevTrackIdRef.current = state.currentTrack?.id ?? null;
    if (!changed || !state.currentTrack) return;

    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null; }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    setIsTrackLoading(true);
    fallbackTimerRef.current = setTimeout(() => setIsTrackLoading(false), 8000);
  }, [state.currentTrack]);

  useEffect(() => {
    if (!isTrackLoading || state.progress === 0 || dismissTimerRef.current) return;
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      setIsTrackLoading(false);
    }, 300);
  }, [isTrackLoading, state.progress]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  function handleTransitionEnd() {
    if (!visible && !state.currentTrack) {
      setMounted(false);
      lastTrackRef.current = null;
    }
  }

  if (!mounted) return null;

  const displayTrack = state.currentTrack ?? lastTrackRef.current;
  const { isPlaying } = state;
  const art = displayTrack?.album.images[0]?.url;
  const artistNames = displayTrack?.artists.map((a) => a.name).join(', ') ?? '';

  return (
    <div
      className={`tf-playback-toast tf-playback-toast--${position}${visible ? ' tf-playback-toast--visible' : ''}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="tf-playback-toast__body">
        {art && (
          <img
            className="tf-playback-toast__art"
            src={art}
            alt={displayTrack?.album.name}
            loading="lazy"
          />
        )}
        <div className="tf-playback-toast__info">
          <span className="tf-playback-toast__name">{displayTrack?.name}</span>
          <span className="tf-playback-toast__artist">{artistNames}</span>
          {state.previewEnded && (
            <span className="tf-playback-toast__preview-ended">Preview ended</span>
          )}
        </div>
        <div className="tf-playback-toast__controls">
          <button
            className="tf-playback-toast__btn tf-playback-toast__btn--prev"
            onClick={previous}
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>
          <button
            className="tf-playback-toast__btn tf-playback-toast__btn--play"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M6 19h4V5H6zm8-14v14h4V5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            className="tf-playback-toast__btn tf-playback-toast__btn--next"
            onClick={next}
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M6 18l8.5-6L6 6v12zm8.5 0h2V6h-2v12z" />
            </svg>
          </button>
        </div>
        <button
          className="tf-playback-toast__btn tf-playback-toast__btn--close"
          onClick={stop}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div className={`tf-loading-bar${!isTrackLoading ? ' tf-loading-bar--hidden' : ''}`}>
        <div className="tf-loading-bar__indicator" />
      </div>
    </div>
  );
}
