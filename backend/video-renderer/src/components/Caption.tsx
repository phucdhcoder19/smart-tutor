import { interpolate, useCurrentFrame } from 'remotion';

import { fontFamily } from '../theme';

const MAX_WORDS_PER_CHUNK = 11;

/** Break text at sentence/clause punctuation first, then split any long clause evenly by words. */
function splitIntoLines(text: string): string[] {
  const clauses = text.match(/[^.!?;:,]+[.!?;:,]*/g)?.map((c) => c.trim()).filter(Boolean) ?? [text];

  // Merge tiny clauses ("Yes," "First,") into the next one so captions don't flash.
  const merged: string[] = [];
  for (const clause of clauses) {
    const last = merged[merged.length - 1];
    if (last && (last.split(' ').length < 4 || `${last} ${clause}`.split(' ').length <= MAX_WORDS_PER_CHUNK)) {
      merged[merged.length - 1] = `${last} ${clause}`;
    } else {
      merged.push(clause);
    }
  }

  return merged.flatMap((clause) => {
    const words = clause.split(/\s+/);
    const count = Math.ceil(words.length / MAX_WORDS_PER_CHUNK);
    const size = Math.ceil(words.length / count);
    return Array.from({ length: count }, (_, i) => words.slice(i * size, (i + 1) * size).join(' '));
  });
}

/** Caption lines, each timed by its share of the characters (speech rate is roughly constant). */
function chunk(text: string): { text: string; start: number; end: number }[] {
  const parts = splitIntoLines(text);
  const total = parts.reduce((n, p) => n + p.length, 0);
  let cursor = 0;
  return parts.map((p) => {
    const start = cursor / total;
    cursor += p.length;
    return { text: p, start, end: cursor / total };
  });
}

type Props = { text: string; durationInFrames: number };

/** Subtitle shown at the bottom while a beat is spoken. Rendered inside the beat's <Sequence>. */
export const Caption: React.FC<Props> = ({ text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const progress = frame / durationInFrames;
  const current = chunk(text).find((c) => progress >= c.start && progress < c.end) ?? null;
  if (!current) return null;

  const localStart = current.start * durationInFrames;
  const opacity = interpolate(frame - localStart, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 44,
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          fontFamily,
          maxWidth: 1000,
          textAlign: 'center',
          fontSize: 30,
          fontWeight: 600,
          lineHeight: 1.35,
          color: '#fff',
          background: 'rgba(8, 12, 24, 0.78)',
          padding: '10px 22px',
          borderRadius: 12,
        }}
      >
        {current.text}
      </div>
    </div>
  );
};
