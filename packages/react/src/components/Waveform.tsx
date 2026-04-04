export function Waveform({ paused }: { paused?: boolean }) {
  return (
    <span className={`tf-waveform${paused ? ' tf-waveform--paused' : ''}`}>
      <span className="tf-waveform__bar" />
      <span className="tf-waveform__bar" />
      <span className="tf-waveform__bar" />
      <span className="tf-waveform__bar" />
    </span>
  );
}
