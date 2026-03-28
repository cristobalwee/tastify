/// <reference path="./spotify-embed.d.ts" />

const EMBED_URL = 'https://open.spotify.com/embed/iframe-api/v1';
const LOAD_TIMEOUT_MS = 10_000;

let loadPromise: Promise<SpotifyIframeApi> | null = null;

/**
 * Loads the Spotify IFrame Embed API script exactly once.
 * Resolves with the API object when `window.onSpotifyIframeApiReady` fires.
 */
export function loadSpotifyEmbed(): Promise<SpotifyIframeApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Spotify Embed API requires a browser environment'));
  }

  if (window.SpotifyIframeApi) {
    return Promise.resolve(window.SpotifyIframeApi);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<SpotifyIframeApi>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Spotify Embed API load timed out'));
    }, LOAD_TIMEOUT_MS);

    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      clearTimeout(timeout);
      window.SpotifyIframeApi = IFrameAPI;
      resolve(IFrameAPI);
    };

    const script = document.createElement('script');
    script.src = EMBED_URL;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      loadPromise = null;
      reject(new Error('Failed to load Spotify Embed API script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
