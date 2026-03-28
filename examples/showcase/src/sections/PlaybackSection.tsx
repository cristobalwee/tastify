import { useState } from 'react';
import { usePlayback, useTopTracks, type ToastPosition } from '@tastify/react';
import { SectionLayout, Select } from './Controls';

const POSITION_OPTIONS: { value: ToastPosition; label: string }[] = [
  { value: 'top-left', label: 'top-left' },
  { value: 'top-center', label: 'top-center' },
  { value: 'top-right', label: 'top-right' },
  { value: 'bottom-left', label: 'bottom-left' },
  { value: 'bottom-center', label: 'bottom-center' },
  { value: 'bottom-right', label: 'bottom-right' },
];

export function PlaybackSection({
  ui,
  toastPosition,
  onUiChange,
  onPositionChange,
}: {
  ui: 'bar' | 'toast';
  toastPosition: ToastPosition;
  onUiChange: (v: 'bar' | 'toast') => void;
  onPositionChange: (v: ToastPosition) => void;
}) {
  const { state, play, setQueue, playbackMode } = usePlayback();
  const tracksState = useTopTracks({ timeRange: 'medium_term', limit: 10 });
  const [selectedRange] = useState<'short_term' | 'medium_term' | 'long_term'>('medium_term');

  const isFullPlayback = playbackMode === 'sdk' || playbackMode === 'embed';

  const tracks =
    tracksState.status === 'success' ? tracksState.data.tracks : [];

  function handleTrackClick(index: number) {
    const track = tracks[index];
    if (!track) return;

    if (isFullPlayback) {
      // In SDK/embed mode all tracks are playable
      setQueue(tracks, index);
    } else {
      if (!track.previewUrl) return;
      const playable = tracks.filter((t) => t.previewUrl);
      const playableIndex = playable.findIndex((t) => t.id === track.id);
      setQueue(playable, playableIndex >= 0 ? playableIndex : 0);
    }
  }

  const code = ui === 'bar'
    ? `<PlaybackProvider ui="bar">
  <PlaybackOverlay />
  {/* Click any track to play */}
</PlaybackProvider>`
    : `<PlaybackProvider ui="toast" toastPosition="${toastPosition}">
  <PlaybackOverlay />
  {/* Click any track to play */}
</PlaybackProvider>`;

  return (
    <SectionLayout
      title="Playback"
      description={playbackMode === 'sdk'
        ? 'Full-track streaming via Spotify Web Playback SDK (Premium). Click a track below to start playing.'
        : playbackMode === 'embed'
        ? 'Spotify embed playback with ~30-second previews. Click a track below to start playing.'
        : 'Browser audio playback with 30-second Spotify previews. Click a track below to start playing, then use the controls in the playback bar or toast.'
      }
      code={code}
      controls={
        <>
          <Select
            label="ui"
            value={ui}
            options={[
              { value: 'bar', label: 'bar' },
              { value: 'toast', label: 'toast' },
            ]}
            onChange={onUiChange}
          />
          {ui === 'toast' && (
            <Select
              label="toastPosition"
              value={toastPosition}
              options={POSITION_OPTIONS}
              onChange={onPositionChange}
            />
          )}
        </>
      }
    >
      <div className="playback-demo">
        {state.currentTrack && (
          <div className="playback-demo__now-playing">
            <span className="playback-demo__label">Now playing:</span>
            <strong>{state.currentTrack.name}</strong>
            <span className="playback-demo__sep">—</span>
            <span>{state.currentTrack.artists.map((a) => a.name).join(', ')}</span>
          </div>
        )}
        <div className="playback-demo__tracks">
          {tracks.length === 0 && (
            <p style={{ color: 'var(--sc-muted)', fontSize: '0.875rem' }}>
              Loading your top tracks...
            </p>
          )}
          {tracks.map((track, i) => (
            <button
              key={track.id}
              className={`playback-demo__track${state.currentTrack?.id === track.id ? ' playback-demo__track--active' : ''}${!isFullPlayback && !track.previewUrl ? ' playback-demo__track--disabled' : ''}`}
              onClick={() => handleTrackClick(i)}
              disabled={!isFullPlayback && !track.previewUrl}
            >
              {track.album.images[0]?.url && (
                <img
                  className="playback-demo__art"
                  src={track.album.images[0].url}
                  alt={track.album.name}
                  loading="lazy"
                />
              )}
              <div className="playback-demo__info">
                <span className="playback-demo__name">{track.name}</span>
                <span className="playback-demo__artist">
                  {track.artists.map((a) => a.name).join(', ')}
                </span>
              </div>
              {state.currentTrack?.id === track.id && state.isPlaying && (
                <span className="tf-now-playing__pulse" />
              )}
              {!isFullPlayback && !track.previewUrl && (
                <span className="playback-demo__no-preview">No preview</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </SectionLayout>
  );
}
