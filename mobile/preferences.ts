import { File, Paths } from 'expo-file-system';

import { DEFAULT_LEVELS, restoreLevels, savedMix } from '../dist/sound-library.js';
import { DEFAULT_TIMER, restoreTimerSettings, restorePersonalMixes, serializePersonalMixes,
  type TimerSettings, type PersonalMix } from '../dist/session-settings.js';
import type { Levels } from './mix';

const preferences = new File(Paths.document, 'sleep-sounds-mix.json');
const timerFile = new File(Paths.document, 'sleep-sounds-timer.json');
const mixesFile = new File(Paths.document, 'sleep-sounds-presets.json');

export function readLevels(): Levels {
  try {
    return restoreLevels(JSON.parse(preferences.textSync())) ?? DEFAULT_LEVELS;
  } catch {
    return DEFAULT_LEVELS;
  }
}

export function saveLevels(levels: Levels) {
  try {
    preferences.write(JSON.stringify(savedMix(levels)));
  } catch {
    // Playback can still use the current in-memory mix.
  }
}

export function readTimerSettings(): TimerSettings {
  try {
    return restoreTimerSettings(JSON.parse(timerFile.textSync()));
  } catch {
    return DEFAULT_TIMER;
  }
}

export function saveTimerSettings(timer: TimerSettings) {
  try {
    timerFile.write(JSON.stringify(timer));
  } catch {
    // The current timer remains available for this session.
  }
}

export function readPersonalMixes(): PersonalMix[] {
  try {
    return restorePersonalMixes(JSON.parse(mixesFile.textSync()));
  } catch {
    return [];
  }
}

export function savePersonalMixes(mixes: readonly PersonalMix[]) {
  mixesFile.write(JSON.stringify(serializePersonalMixes(mixes)));
}
