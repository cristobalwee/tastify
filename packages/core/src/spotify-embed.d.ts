/**
 * Type declarations for the Spotify IFrame Embed API.
 * @see https://developer.spotify.com/documentation/embeds/references/iframe-api
 */

interface Window {
  onSpotifyIframeApiReady?: (IFrameAPI: SpotifyIframeApi) => void;
  SpotifyIframeApi?: SpotifyIframeApi;
}

interface SpotifyIframeApi {
  createController(
    element: HTMLElement,
    options: SpotifyEmbedOptions,
    callback: (controller: SpotifyEmbedController) => void,
  ): void;
}

interface SpotifyEmbedOptions {
  uri?: string;
  width?: string | number;
  height?: string | number;
}

interface SpotifyEmbedPlaybackUpdate {
  data: {
    isPaused: boolean;
    isBuffering: boolean;
    position: number;
    duration: number;
  };
}

interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: 'playback_update', cb: (e: SpotifyEmbedPlaybackUpdate) => void): void;
  addListener(event: 'ready', cb: () => void): void;
}
