// Midnight Obsidian — shared design tokens (mirrors dist/style.css :root)
export const colors = {
  background: '#070a0f',
  surface: '#101620',
  surfaceActive: '#121926',
  surfaceElevated: 'rgba(17, 23, 34, 0.96)',
  surfaceSolid: '#111722',
  hairline: 'rgba(255, 255, 255, 0.065)',
  hairlineStrong: 'rgba(255, 255, 255, 0.13)',
  text: '#eef2f8',
  textSoft: '#b7c3d4',
  muted: '#8492a6',
  dim: '#556275',
  accent: '#dce7f7',
  accentInk: '#080c12',
  pillActiveBg: 'rgba(220, 231, 247, 0.14)',
  pillActiveBorder: 'rgba(220, 231, 247, 0.34)',
  timerActiveBg: 'rgba(140, 196, 255, 0.14)',
  timerActiveBorder: 'rgba(140, 196, 255, 0.34)',
  timerActiveText: '#b7d9ff',
  error: '#f5a69b',
};

export type SoundAccent = {
  accent: string;
  fill: string;
  border: string;
};

export const soundAccents: Record<string, SoundAccent> = {
  rain: { accent: '#8cc4ff', fill: 'rgba(123, 184, 245, 0.24)', border: 'rgba(140, 196, 255, 0.38)' },
  ocean: { accent: '#6ee0d4', fill: 'rgba(95, 212, 200, 0.22)', border: 'rgba(110, 224, 212, 0.36)' },
  fireplace: { accent: '#f9b878', fill: 'rgba(245, 169, 98, 0.24)', border: 'rgba(249, 184, 120, 0.38)' },
  stream: { accent: '#8be0b2', fill: 'rgba(124, 212, 166, 0.22)', border: 'rgba(139, 224, 178, 0.36)' },
  airplane: { accent: '#b0c7e6', fill: 'rgba(154, 180, 216, 0.22)', border: 'rgba(176, 199, 230, 0.36)' },
  train: { accent: '#ebd099', fill: 'rgba(223, 185, 120, 0.22)', border: 'rgba(235, 208, 153, 0.36)' },
  'coffee-shop': { accent: '#f0b396', fill: 'rgba(230, 160, 128, 0.23)', border: 'rgba(240, 179, 150, 0.38)' },
  pink: { accent: '#e0b0f2', fill: 'rgba(212, 156, 232, 0.22)', border: 'rgba(224, 176, 242, 0.36)' },
  brown: { accent: '#d8b594', fill: 'rgba(201, 162, 126, 0.22)', border: 'rgba(216, 181, 148, 0.36)' },
  white: { accent: '#bac9fa', fill: 'rgba(165, 184, 245, 0.22)', border: 'rgba(186, 201, 250, 0.36)' },
};

export const defaultSoundAccent: SoundAccent = soundAccents.rain;
