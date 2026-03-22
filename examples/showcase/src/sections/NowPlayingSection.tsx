import { useState } from 'react';
import { NowPlaying } from '@tastify/react';
import { SectionLayout, Toggle, NumberInput } from './Controls';

export function NowPlayingSection() {
  const [showArt, setShowArt] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showLink, setShowLink] = useState(true);
  const [compact, setCompact] = useState(false);
  const [pollInterval, setPollInterval] = useState(15);

  const code = `<NowPlaying
  showArt={${showArt}}
  showProgress={${showProgress}}
  showLink={${showLink}}
  compact={${compact}}
  pollInterval={${pollInterval * 1000}}
  fallback={<span>Nothing playing</span>}
/>`;

  return (
    <SectionLayout
      title="NowPlaying"
      description="Displays the currently playing track with album art, progress bar, and Spotify link."
      code={code}
      controls={
        <>
          <Toggle label="showArt" value={showArt} onChange={setShowArt} />
          <Toggle label="showProgress" value={showProgress} onChange={setShowProgress} />
          <Toggle label="showLink" value={showLink} onChange={setShowLink} />
          <Toggle label="compact" value={compact} onChange={setCompact} />
          <NumberInput label="pollInterval (s)" value={pollInterval} min={5} max={120} onChange={setPollInterval} />
        </>
      }
    >
      <NowPlaying
        showArt={showArt}
        showProgress={showProgress}
        showLink={showLink}
        compact={compact}
        pollInterval={pollInterval * 1000}
        fallback={<span style={{ padding: '0.75rem', color: '#888' }}>Nothing playing right now</span>}
      />
    </SectionLayout>
  );
}
