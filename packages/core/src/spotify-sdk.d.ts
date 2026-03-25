/**
 * Type declarations for the Spotify Web Playback SDK.
 * @see https://developer.spotify.com/documentation/web-playback-sdk/reference
 */

interface Window {
  onSpotifyWebPlaybackSDKReady?: () => void;
  Spotify?: typeof Spotify;
}

declare namespace Spotify {
  interface PlayerInit {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }

  interface WebPlaybackTrack {
    uri: string;
    id: string;
    type: 'track' | 'episode' | 'ad';
    media_type: 'audio' | 'video';
    name: string;
    is_playable: boolean;
    album: {
      uri: string;
      name: string;
      images: Array<{ url: string; width: number; height: number }>;
    };
    artists: Array<{ uri: string; name: string }>;
  }

  interface WebPlaybackState {
    context: {
      uri: string | null;
      metadata: Record<string, string> | null;
    };
    disallows: Record<string, boolean>;
    paused: boolean;
    position: number;
    duration: number;
    repeat_mode: 0 | 1 | 2;
    shuffle: boolean;
    track_window: {
      current_track: WebPlaybackTrack;
      previous_tracks: WebPlaybackTrack[];
      next_tracks: WebPlaybackTrack[];
    };
  }

  interface WebPlaybackError {
    message: string;
  }

  type ReadyEvent = { device_id: string };

  class Player {
    constructor(options: PlayerInit);
    connect(): Promise<boolean>;
    disconnect(): void;
    getCurrentState(): Promise<WebPlaybackState | null>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
    activateElement(): Promise<void>;

    addListener(event: 'ready', cb: (data: ReadyEvent) => void): boolean;
    addListener(event: 'not_ready', cb: (data: ReadyEvent) => void): boolean;
    addListener(
      event: 'player_state_changed',
      cb: (state: WebPlaybackState | null) => void,
    ): boolean;
    addListener(
      event: 'initialization_error',
      cb: (error: WebPlaybackError) => void,
    ): boolean;
    addListener(
      event: 'authentication_error',
      cb: (error: WebPlaybackError) => void,
    ): boolean;
    addListener(
      event: 'account_error',
      cb: (error: WebPlaybackError) => void,
    ): boolean;
    addListener(
      event: 'playback_error',
      cb: (error: WebPlaybackError) => void,
    ): boolean;

    removeListener(event: string, cb?: (...args: unknown[]) => void): boolean;
  }
}
