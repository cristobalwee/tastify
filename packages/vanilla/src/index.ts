export { mount } from './mount.js';
export type { MountOptions, MountedWidget, TastifyTheme } from './mount.js';
export { mountPlaybackBar, mountPlaybackToast } from './playback-mount.js';
export type { PlaybackBarMountOptions, PlaybackToastMountOptions, PlaybackWidget } from './playback-mount.js';

export type {
  TastifyImage,
  TastifyAlbum,
  TastifyArtist,
  TastifyTrack,
  NowPlayingData,
  TopTracksData,
  TopAlbumsData,
  TopArtistsData,
  RecentlyPlayedData,
  TastifyTopAlbum,
  TimeRange,
  DataState,
  TastifyConfig,
  PlaybackState,
  PlaybackMode,
  SDKPlayerOptions,
} from '@tastify/core';
export { TastifyError, getAudioPlayer, getOrCreateSDKPlayer } from '@tastify/core';
