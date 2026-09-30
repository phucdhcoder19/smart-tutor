import { loadFont } from '@remotion/google-fonts/BeVietnamPro';

export const { fontFamily } = loadFont('normal', {
  weights: ['400', '600', '800'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
});

export const PALETTE = ['#4f8cff', '#1fc7a4', '#ff9f43', '#a78bfa', '#ff6b9a'];

export const colors = {
  ink: '#0d1424',
  white: '#ffffff',
  muted: 'rgba(255,255,255,0.72)',
};

export const accentFor = (index: number) => PALETTE[index % PALETTE.length];
