import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { accentFor, colors, fontFamily, PALETTE } from '../theme';

type Props = { recap: string[]; takeaway: string; labels: { recap: string; takeaway: string } };

export const OutroScene: React.FC<Props> = ({ recap, takeaway, labels }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const takeawayStart = 12 + recap.length * 8;
  const takeawayIn = spring({ frame: frame - takeawayStart, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 85% 15%, ${PALETTE[0]}55, transparent 45%), ${colors.ink}`,
        padding: '70px 90px',
        fontFamily,
      }}
    >
      <div style={{ color: PALETTE[2], fontSize: 22, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase' }}>
        {labels.recap}
      </div>

      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {recap.map((item, i) => {
          const appear = spring({ frame: frame - 8 - i * 8, fps, config: { damping: 16 } });
          return (
            <div
              key={i}
              style={{ display: 'flex', gap: 18, alignItems: 'center', opacity: appear, transform: `translateY(${(1 - appear) * 20}px)` }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  flexShrink: 0,
                  background: accentFor(i),
                  color: colors.ink,
                  fontWeight: 800,
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✓
              </div>
              <span style={{ color: colors.white, fontSize: 30, lineHeight: 1.3 }}>{item}</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 'auto',
          borderLeft: `6px solid ${PALETTE[2]}`,
          paddingLeft: 26,
          opacity: takeawayIn,
          transform: `translateY(${interpolate(takeawayIn, [0, 1], [20, 0])}px)`,
        }}
      >
        <div style={{ color: colors.muted, fontSize: 20, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
          {labels.takeaway}
        </div>
        <div style={{ color: colors.white, fontSize: 36, lineHeight: 1.35, fontWeight: 800, marginTop: 8 }}>{takeaway}</div>
      </div>
    </AbsoluteFill>
  );
};
