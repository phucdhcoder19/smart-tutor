import { CalculateMetadataFunction, Composition } from 'remotion';

import { sampleProps } from './sample-props';
import { FPS, HEIGHT, totalFrames, WIDTH } from './timeline';
import { TrainingVideo } from './TrainingVideo';
import type { VideoProps } from './types';

const calculateMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: totalFrames(props),
  props,
});

export const Root: React.FC = () => (
  <Composition
    id="TrainingVideo"
    component={TrainingVideo}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={sampleProps}
    calculateMetadata={calculateMetadata}
  />
);
