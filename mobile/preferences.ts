import { File, Paths } from 'expo-file-system';

import type { Levels } from './mix';

const defaults: Levels = [70, 0];
const preferences = new File(Paths.document, 'sleep-sounds-mix.json');

function isLevel(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function readLevels(): Levels {
  try {
    const saved: unknown = JSON.parse(preferences.textSync());
    if (Array.isArray(saved) && isLevel(saved[0]) && isLevel(saved[1])) {
      return [Math.round(saved[0]), Math.round(saved[1])];
    }
  } catch {
    // First launch or unavailable preferences.
  }
  return defaults;
}

export function saveLevels(levels: Levels) {
  try {
    preferences.write(JSON.stringify(levels));
  } catch {
    // Playback can still use the current in-memory mix.
  }
}
