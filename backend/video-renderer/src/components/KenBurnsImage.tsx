import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';

type Props = {
  src: string | null;
  /** Alternates the pan direction so consecutive scenes don't move the same way. */
  variant: number;
  fallbackColor: string;
  /** Length of the move, i.e. how long the image is on screen. */
  durationInFrames: number;
};

/** Slow zoom + pan over a still image: the classic documentary "Ken Burns" motion. */
export const KenBurnsImage: React.FC<Props> = ({ src, variant, fallbackColor, durationInFrames }) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, frame / durationInFrames);

  const zoomIn = variant % 2 === 0;
  const scale = interpolate(progress, [0, 1], zoomIn ? [1.05, 1.18] : [1.18, 1.05]);
  const direction = variant % 3 === 0 ? 1 : -1;
  const x = interpolate(progress, [0, 1], [-2 * direction, 2 * direction]);
  const y = interpolate(progress, [0, 1], [1, -1]);

  if (!src) {
    return <AbsoluteFill style={{ background: `radial-gradient(circle at 70% 40%, ${fallbackColor}, #0d1424 70%)` }} />;
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${x}%, ${y}%)`,
        }}
      />
    </AbsoluteFill>
  );
};
