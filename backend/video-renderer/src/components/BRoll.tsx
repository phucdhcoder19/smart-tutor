import { Video } from '@remotion/media';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import type { Clip } from '../types';
import { KenBurnsImage } from './KenBurnsImage';

/** Slowest we stretch a clip before looping it instead; below this motion looks unnatural. */
const MIN_PLAYBACK_RATE = 0.5;
const FADE_IN_FRAMES = 8;

type Props = {
  clip: Clip | null;
  clipUrl: string | null;
  fallbackImage: string | null;
  variant: number;
  accent: string;
  /** How long this shot is on screen. */
  durationInFrames: number;
  /** Start partway into the clip, so a reused clip doesn't show the same frames twice. */
  startAtSeconds?: number;
};

/**
 * Background footage for one beat. A Veo clip is slowed down (never sped up) to cover the
 * whole beat; without a clip, the scene photo gets a Ken Burns move so the frame never freezes.
 */
export const BRoll: React.FC<Props> = ({ clip, clipUrl, fallbackImage, variant, accent, durationInFrames, startAtSeconds = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, FADE_IN_FRAMES], [variant === 0 ? 1 : 0, 1], { extrapolateRight: 'clamp' });

  if (!clip || !clipUrl) {
    return (
      <AbsoluteFill style={{ opacity }}>
        <KenBurnsImage src={fallbackImage} variant={variant} fallbackColor={accent} durationInFrames={durationInFrames} />
      </AbsoluteFill>
    );
  }

  const trimBefore = Math.round(startAtSeconds * fps);
  const clipFrames = clip.seconds * fps - trimBefore;
  const playbackRate = Math.min(1, Math.max(MIN_PLAYBACK_RATE, clipFrames / durationInFrames));

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* @remotion/media decodes with WebCodecs: much faster to render than OffthreadVideo. */}
      <Video src={clipUrl} muted loop trimBefore={trimBefore} playbackRate={playbackRate} objectFit="cover" style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};
