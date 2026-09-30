/**
 * Input props produced by the Python backend (see app/services/remotion.py).
 * Asset fields are file names relative to `assetBaseUrl`.
 */

/** A Veo-generated B-roll clip. */
export type Clip = { src: string; seconds: number };

export type Beat = {
  /** Spoken sentence(s), also shown as the caption. */
  text: string;
  /** Short on-screen point revealed when this beat starts, or null. */
  bullet: string | null;
  audio: string;
  durationSec: number;
  /** Live-action footage shown while this beat is spoken; null falls back to the scene image. */
  clip: Clip | null;
};

export type SceneData = {
  title: string;
  image: string | null;
  beats: Beat[];
};

export type VideoProps = {
  assetBaseUrl: string;
  courseTitle: string;
  subtitle: string;
  takeaway: string;
  recap: string[];
  openingClip: Clip | null;
  music: string | null;
  labels: { course: string; lesson: string; recap: string; takeaway: string };
  scenes: SceneData[];
};
