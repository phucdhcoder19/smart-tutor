import { AbsoluteFill, Audio, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRoll } from '../components/BRoll';
import { Caption } from '../components/Caption';
import { accentFor, colors, fontFamily } from '../theme';
import type { SceneTiming } from '../timeline';
import type { Clip, SceneData } from '../types';

type Props = {
  scene: SceneData;
  timing: SceneTiming;
  index: number;
  total: number;
  lessonLabel: string;
  asset: (name: string) => string;
};

const TEXT_SHADOW = '0 2px 12px rgba(0,0,0,0.55)';

/**
 * One lesson scene: full-bleed live-action footage that cuts on every narration beat,
 * with the title and bullets over a soft gradient. Each bullet slides in when its beat is spoken.
 */
export const ContentScene: React.FC<Props> = ({ scene, timing, index, total, lessonLabel, asset }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = accentFor(index);
  const image = scene.image ? asset(scene.image) : null;

  // Beats without their own footage reuse another clip from this scene, starting halfway in.
  const sceneClips = scene.beats.map((b) => b.clip).filter((c): c is Clip => c !== null);
  const shotFor = (i: number) => {
    const own = scene.beats[i].clip;
    if (own) return { clip: own, startAtSeconds: 0 };
    if (sceneClips.length === 0) return { clip: null, startAtSeconds: 0 };
    const borrowed = sceneClips[i % sceneClips.length];
    return { clip: borrowed, startAtSeconds: borrowed.seconds / 2 };
  };

  const panelIn = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });

  const bullets = scene.beats
    .map((beat, i) => ({ text: beat.bullet, from: timing.beats[i].from, beatIndex: i }))
    .filter((b): b is { text: string; from: number; beatIndex: number } => Boolean(b.text));

  const activeBeat = timing.beats.findIndex((t) => frame >= t.from && frame < t.from + t.durationInFrames);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.ink, fontFamily }}>
      {/* Footage: one shot per beat. */}
      {scene.beats.map((_, i) => {
        const { clip, startAtSeconds } = shotFor(i);
        return (
          <Sequence key={`shot-${i}`} from={timing.beats[i].visual.from} durationInFrames={timing.beats[i].visual.durationInFrames}>
            <BRoll
              clip={clip}
              clipUrl={clip ? asset(clip.src) : null}
              fallbackImage={image}
              variant={index * 4 + i}
              accent={accent}
              durationInFrames={timing.beats[i].visual.durationInFrames}
              startAtSeconds={startAtSeconds}
            />
          </Sequence>
        );
      })}

      {/* Legibility: darken the left side (text) and the bottom (captions). */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(90deg, rgba(8,12,24,0.88) 0%, rgba(8,12,24,0.6) 32%, rgba(8,12,24,0) 58%),' +
            'linear-gradient(0deg, rgba(8,12,24,0.7) 0%, rgba(8,12,24,0) 30%)',
        }}
      />

      <AbsoluteFill
        style={{
          width: '50%',
          padding: '60px 0 0 72px',
          opacity: panelIn,
          transform: `translateX(${(1 - panelIn) * -30}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 6, borderRadius: 3, background: accent }} />
          <span style={{ color: colors.muted, fontSize: 20, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
            {lessonLabel} {index + 1}/{total}
          </span>
        </div>

        <h2 style={{ margin: '16px 0 0', color: colors.white, fontSize: 50, lineHeight: 1.12, fontWeight: 800, textShadow: TEXT_SHADOW }}>
          {scene.title}
        </h2>

        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bullets.map((b) => {
            const appear = spring({ frame: frame - b.from, fps, config: { damping: 18, mass: 0.7 } });
            const active = b.beatIndex === activeBeat;
            return (
              <div
                key={b.beatIndex}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  opacity: appear * (active ? 1 : 0.75),
                  transform: `translateX(${(1 - appear) * -40}px)`,
                }}
              >
                <div
                  style={{
                    marginTop: 12,
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    borderRadius: 4,
                    background: accent,
                    transform: `scale(${active ? 1.25 : 1})`,
                  }}
                />
                <span
                  style={{ color: colors.white, fontSize: 29, lineHeight: 1.35, fontWeight: active ? 600 : 400, textShadow: TEXT_SHADOW }}
                >
                  {b.text}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Narration + captions, one sequence per beat. */}
      {scene.beats.map((beat, i) => (
        <Sequence key={`voice-${i}`} from={timing.beats[i].from} durationInFrames={timing.beats[i].durationInFrames} layout="none">
          {beat.audio && <Audio src={asset(beat.audio)} />}
          <Caption text={beat.text} durationInFrames={timing.beats[i].durationInFrames} />
        </Sequence>
      ))}

      {/* Accent line that grows while the scene plays. */}
      <div
        style={{
          position: 'absolute',
          left: 72,
          bottom: 0,
          height: 4,
          width: interpolate(frame, [0, timing.durationInFrames], [0, 300], { extrapolateRight: 'clamp' }),
          background: accent,
        }}
      />
    </AbsoluteFill>
  );
};
