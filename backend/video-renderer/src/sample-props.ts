import type { VideoProps } from './types';

/** Placeholder props so the composition opens in Remotion Studio without a backend run. */
export const sampleProps: VideoProps = {
  assetBaseUrl: '',
  courseTitle: 'Phishing Awareness Essentials',
  subtitle: 'Stop, look, and verify before you click.',
  takeaway: 'When in doubt, report it. Reporting fast limits the damage.',
  recap: ['Spot urgency and fake sender domains', 'Hover before you click', 'Report suspicious messages'],
  openingClip: null,
  music: null,
  labels: { course: 'Training course', lesson: 'Lesson', recap: 'Recap', takeaway: 'Key takeaway' },
  scenes: [
    {
      title: 'What is phishing?',
      image: null,
      beats: [
        { text: 'Phishing is when criminals pretend to be someone you trust.', bullet: 'Attackers impersonate trusted senders', audio: '', durationSec: 3, clip: null },
        { text: 'Over ninety percent of cyber attacks start with a phishing email.', bullet: '90% of attacks start with email', audio: '', durationSec: 3, clip: null },
      ],
    },
  ],
};
