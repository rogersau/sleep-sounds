import { DEFAULT_LEVELS, restoreLevels, savedMix } from '../dist/sound-library.js';
import {
  DEFAULT_TIMER, restoreTimerSettings, restorePersonalMixes, serializePersonalMixes,
  type TimerSettings, type PersonalMix,
} from '../dist/session-settings.js';
import type { Levels } from './mix';

const MIX_KEY = 'sleepSoundsMixV8';
const TIMER_KEY = 'sleepSoundsTimer';
const MIXES_KEY = 'sleepSoundsSavedMixes';

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readLevels(): Levels {
  try {
    const raw = getStorage()?.getItem(MIX_KEY);
    return (raw ? restoreLevels(JSON.parse(raw)) : null) ?? DEFAULT_LEVELS;
  } catch {
    return DEFAULT_LEVELS;
  }
}

export function saveLevels(levels: Levels) {
  try {
    getStorage()?.setItem(MIX_KEY, JSON.stringify(savedMix(levels)));
  } catch {
    // Playback can still use the current in-memory mix.
  }
}

export function readTimerSettings(): TimerSettings {
  try {
    const raw = getStorage()?.getItem(TIMER_KEY);
    return raw ? restoreTimerSettings(JSON.parse(raw)) : DEFAULT_TIMER;
  } catch {
    return DEFAULT_TIMER;
  }
}

export function saveTimerSettings(timer: TimerSettings) {
  try {
    getStorage()?.setItem(TIMER_KEY, JSON.stringify(timer));
  } catch {
    // The current timer remains available for this session.
  }
}

export function readPersonalMixes(): PersonalMix[] {
  try {
    const raw = getStorage()?.getItem(MIXES_KEY);
    return raw ? restorePersonalMixes(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function savePersonalMixes(mixes: readonly PersonalMix[]) {
  const storage = getStorage();
  if (!storage) throw new Error('Storage unavailable');
  storage.setItem(MIXES_KEY, JSON.stringify(serializePersonalMixes(mixes)));
}
