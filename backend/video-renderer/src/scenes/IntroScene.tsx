import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRoll } from '../components/BRoll';
import { colors, fontFamily, PALETTE } from '../theme';
import { INTRO_FRAMES } from '../timeline';
import type { Clip } from '../types';

type Props = {
  title: string;
  subtitle: string;
  label: string;
  openingClip: Clip | null;
  openingClipUrl: string | null;
};

export const IntroScene: React.FC<Props> = ({ title, subtitle, label, openingClip, openingClipUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = title.split(' ');

  const labelIn = spring({ frame, fps, config: { damping: 200 } });
  const subtitleOpacity = interpolate(frame, [words.length * 3 + 12, words.length * 3 + 28], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.ink }}>
      <BRoll
        clip={openingClip}
        clipUrl={openingClipUrl}
        fallbackImage={null}
        variant={0}
        accent={PALETTE[0]}
        durationInFrames={INTRO_FRAMES}
      />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(8,12,24,0.35) 0%, rgba(8,12,24,0.92) 75%)' }} />

      <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '0 90px 110px', fontFamily }}>
        <div
          style={{
            alignSelf: 'flex-start',
            color: colors.ink,
            background: PALETTE[2],
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: 3,
            textTransform: 'uppercase',
            padding: '8px 18px',
            borderRadius: 999,
            opacity: labelIn,
            transform: `translateX(${(1 - labelIn) * -40}px)`,
          }}
        >
          {label}
        </div>

        <h1 style={{ margin: '22px 0 0', fontSize: 72, lineHeight: 1.08, fontWeight: 800, color: colors.white }}>
          {words.map((word, i) => {
            const pop = spring({ frame: frame - 6 - i * 3, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <span
                key={i}
                style={{ display: 'inline-block', marginRight: 18, opacity: pop, transform: `translateY(${(1 - pop) * 40}px)` }}
              >
                {word}
              </span>
            );
          })}
        </h1>

        <p style={{ margin: '18px 0 0', fontSize: 30, lineHeight: 1.4, color: colors.muted, opacity: subtitleOpacity, maxWidth: 1000 }}>
          {subtitle}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
