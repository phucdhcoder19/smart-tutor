import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Fragment } from 'react';
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from 'remotion';

import { ProgressBar } from './components/ProgressBar';
import { ContentScene } from './scenes/ContentScene';
import { IntroScene } from './scenes/IntroScene';
import { OutroScene } from './scenes/OutroScene';
import { PALETTE } from './theme';
import { INTRO_FRAMES, OUTRO_FRAMES, sceneTiming, TRANSITION_FRAMES } from './timeline';
import type { VideoProps } from './types';

const MUSIC_VOLUME = 0.08;

export const TrainingVideo: React.FC<VideoProps> = (props) => {
  const { durationInFrames, fps } = useVideoConfig();
  const asset = (name: string) => `${props.assetBaseUrl}/${encodeURIComponent(name)}`;
  const timing = linearTiming({ durationInFrames: TRANSITION_FRAMES });

  // Music fades in at the start and out over the last two seconds.
  const musicVolume = (f: number) =>
    interpolate(f, [0, fps, durationInFrames - 2 * fps, durationInFrames], [0, MUSIC_VOLUME, MUSIC_VOLUME, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0d1424' }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={INTRO_FRAMES}>
          <IntroScene
            title={props.courseTitle}
            subtitle={props.subtitle}
            label={props.labels.course}
            openingClip={props.openingClip}
            openingClipUrl={props.openingClip ? asset(props.openingClip.src) : null}
          />
        </TransitionSeries.Sequence>

        {props.scenes.map((scene, i) => {
          const t = sceneTiming(scene);
          return (
            <Fragment key={i}>
              <TransitionSeries.Transition
                timing={timing}
                presentation={i === 0 ? fade() : slide({ direction: i % 2 ? 'from-right' : 'from-bottom' })}
              />
              <TransitionSeries.Sequence durationInFrames={t.durationInFrames}>
                <ContentScene scene={scene} timing={t} index={i} total={props.scenes.length} lessonLabel={props.labels.lesson} asset={asset} />
              </TransitionSeries.Sequence>
            </Fragment>
          );
        })}

        <TransitionSeries.Transition timing={timing} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={OUTRO_FRAMES}>
          <OutroScene recap={props.recap} takeaway={props.takeaway} labels={props.labels} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {props.music && <Audio src={asset(props.music)} loop volume={musicVolume} />}
      <ProgressBar color={PALETTE[2]} />
    </AbsoluteFill>
  );
};
