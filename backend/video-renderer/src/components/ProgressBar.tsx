import { useCurrentFrame, useVideoConfig } from 'remotion';

/** Thin bar across the top showing overall progress through the lesson. */
export const ProgressBar: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'rgba(255,255,255,0.15)' }}>
      <div style={{ width: `${(frame / durationInFrames) * 100}%`, height: '100%', background: color }} />
    </div>
  );
};
