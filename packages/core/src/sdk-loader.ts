/// <reference path="./spotify-sdk.d.ts" />

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
const LOAD_TIMEOUT_MS = 10_000;

let loadPromise: Promise<void> | null = null;

/**
 * Loads the Spotify Web Playback SDK script exactly once.
 * Resolves when `window.onSpotifyWebPlaybackSDKReady` fires.
 */
export function loadSpotifySDK(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Spotify SDK requires a browser environment'));
  }

  if (window.Spotify) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Spotify SDK load timed out'));
    }, LOAD_TIMEOUT_MS);

    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timeout);
      resolve();
    };

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      loadPromise = null;
      reject(new Error('Failed to load Spotify SDK script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
