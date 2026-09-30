import type { SceneData, VideoProps } from './types';

export const FPS = 30;
export const WIDTH = 1280;
export const HEIGHT = 720;

export const INTRO_FRAMES = Math.round(3.5 * FPS);
export const OUTRO_FRAMES = Math.round(6 * FPS);
export const TRANSITION_FRAMES = 15;

/** Silence before the first beat, so the title can animate in. */
const LEAD_IN_FRAMES = Math.round(0.6 * FPS);
const BEAT_GAP_FRAMES = Math.round(0.25 * FPS);
/** Silence after the last beat; covers the transition overlap so voices never collide. */
const TAIL_FRAMES = Math.round(0.5 * FPS) + TRANSITION_FRAMES;

export type Span = { from: number; durationInFrames: number };

/** `from`/`durationInFrames` cover the narration; `visual` is the footage window, which runs until the next beat. */
export type BeatTiming = Span & { visual: Span };

export type SceneTiming = { durationInFrames: number; beats: BeatTiming[] };

export function sceneTiming(scene: SceneData): SceneTiming {
  let cursor = LEAD_IN_FRAMES;
  const spoken = scene.beats.map((beat) => {
    const durationInFrames = Math.ceil(beat.durationSec * FPS);
    const span = { from: cursor, durationInFrames };
    cursor += durationInFrames + BEAT_GAP_FRAMES;
    return span;
  });
  const total = cursor + TAIL_FRAMES;

  // Footage cuts on each beat: the first shot also covers the lead-in, the last one the tail.
  const beats = spoken.map((span, i) => {
    const from = i === 0 ? 0 : span.from;
    const end = i === spoken.length - 1 ? total : spoken[i + 1].from;
    return { ...span, visual: { from, durationInFrames: end - from } };
  });
  return { durationInFrames: total, beats };
}

/** Total length: all sequences minus the overlap of each transition. */
export function totalFrames(props: VideoProps): number {
  const sequences = [INTRO_FRAMES, ...props.scenes.map((s) => sceneTiming(s).durationInFrames), OUTRO_FRAMES];
  const transitions = sequences.length - 1;
  return sequences.reduce((a, b) => a + b, 0) - transitions * TRANSITION_FRAMES;
}
