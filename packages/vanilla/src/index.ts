export { mount } from './mount.js';
export type { MountOptions, MountedWidget } from './mount.js';
export { mountPlaybackBar, mountPlaybackToast } from './playback-mount.js';
export type { PlaybackBarMountOptions, PlaybackToastMountOptions, PlaybackWidget } from './playback-mount.js';

export type {
  TastifyImage,
  TastifyAlbum,
  TastifyArtist,
  TastifyTrack,
  NowPlayingData,
  TopTracksData,
  TopArtistsData,
  RecentlyPlayedData,
  TimeRange,
  DataState,
  TastifyConfig,
  PlaybackState,
} from '@tastify/core';
export { TastifyError, getAudioPlayer } from '@tastify/core';
