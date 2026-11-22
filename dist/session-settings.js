const TIMER_MINUTES = [0, 15, 30, 45, 60, 90, 120];
const FADE_SECONDS = [0, 15, 30, 60];
const DEFAULT_TIMER = Object.freeze({ minutes: 0, fadeSeconds: 30 });
const MAX_MIX_NAME = 40;
const sessionSoundLibrary = typeof module !== 'undefined'
  ? require('./sound-library.js')
  : { restoreLevels, savedMix };

/** @typedef {{ minutes: number, fadeSeconds: number }} TimerSettings */
/** @typedef {{ name: string, levels: readonly number[], boost: number, favorite: boolean }} PersonalMix */

/** @param {unknown} value @returns {TimerSettings} */
function restoreTimerSettings(value) {
  if (!value || typeof value !== 'object') return DEFAULT_TIMER;
  const { minutes, fadeSeconds } = /** @type {TimerSettings} */ (value);
  return {
    minutes: TIMER_MINUTES.includes(minutes) ? minutes : DEFAULT_TIMER.minutes,
    fadeSeconds: FADE_SECONDS.includes(fadeSeconds) ? fadeSeconds : DEFAULT_TIMER.fadeSeconds,
  };
}

/** @param {number} seconds */
function formatRemaining(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const rest = String(total % 60).padStart(2, '0');
  return hours ? hours + ':' + String(minutes).padStart(2, '0') + ':' + rest : minutes + ':' + rest;
}

/** @param {unknown} value */
function cleanMixName(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_MIX_NAME) : '';
}

/** @param {unknown} value @returns {PersonalMix[]} */
function restorePersonalMixes(value) {
  if (!Array.isArray(value)) return [];
  const names = new Set();
  const mixes = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const name = cleanMixName(entry.name);
    const key = name.toLowerCase();
    const levels = sessionSoundLibrary.restoreLevels(entry.levels);
    if (!name || names.has(key) || !levels?.some(level => level > 0)) continue;
    const boost = Number.isFinite(entry.boost) && entry.boost >= 100 && entry.boost <= 150
      ? entry.boost : 100;
    names.add(key);
    mixes.push({ name, levels, boost, favorite: entry.favorite === true });
  }
  return mixes;
}

/** @param {readonly PersonalMix[]} mixes */
function serializePersonalMixes(mixes) {
  return mixes.map(mix => ({ ...mix, levels: sessionSoundLibrary.savedMix(mix.levels) }));
}

/** @param {readonly PersonalMix[]} mixes */
function favoritesFirst(mixes) {
  return [...mixes.filter(mix => mix.favorite), ...mixes.filter(mix => !mix.favorite)];
}

if (typeof module !== 'undefined') {
  module.exports = {
    TIMER_MINUTES, FADE_SECONDS, DEFAULT_TIMER, MAX_MIX_NAME, restoreTimerSettings,
    formatRemaining, cleanMixName, restorePersonalMixes, serializePersonalMixes, favoritesFirst,
  };
}
