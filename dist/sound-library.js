const SOUNDS = /** @type {const} */ ([
  {id: 'rain', title: 'Rain', group: 'Nature', description: 'Steady outdoor rainfall.', seconds: 128,
    version: 6, credit: 'Kresiek The Furry', source: 'https://opengameart.org/content/amb-rain-loop-2'},
  {id: 'pink', title: 'Pink noise', group: 'Noise', description: 'Soft noise with less hiss.', seconds: 128, version: 6},
  {id: 'ocean', title: 'Ocean surf', group: 'Nature', description: 'Waves rolling in at Point Reyes.', seconds: 64,
    version: 8, credit: 'Rmutt', source: 'https://freesound.org/people/Rmutt/sounds/148283/'},
  {id: 'fireplace', title: 'Fireplace', group: 'Nature', description: 'A wood fire with softened crackles.', seconds: 64,
    version: 8, credit: 'NomadApe', source: 'https://freesound.org/people/NomadApe/sounds/444920/'},
  {id: 'stream', title: 'Forest stream', group: 'Nature', description: 'Water flowing over a fallen log.', seconds: 64,
    version: 8, credit: 'kvgarlic', source: 'https://freesound.org/people/kvgarlic/sounds/149743/'},
  {id: 'brown', title: 'Brown noise', group: 'Noise', description: 'Low, steady rumble.', seconds: 32, version: 8},
  {id: 'white', title: 'White noise', group: 'Noise', description: 'Even, brighter hiss.', seconds: 32, version: 8},
]);
const SOUND_GROUPS = ['Nature', 'Noise'];
const PRESETS = /** @type {const} */ ([
  {id: 'rain', title: 'Rain only', mix: {rain: 70}},
  {id: 'coast', title: 'Coast', mix: {ocean: 70}},
  {id: 'fireside', title: 'Fireside', mix: {fireplace: 65}},
  {id: 'creek', title: 'Creekside', mix: {stream: 70}},
  {id: 'dark', title: 'Deep noise', mix: {brown: 60}},
  {id: 'white', title: 'White noise', mix: {white: 55}},
  {id: 'rain-pink', title: 'Rain & pink', mix: {rain: 65, pink: 20}},
  {id: 'rain-louder', title: 'Louder rain', mix: {rain: 90}},
]);

/** @typedef {(typeof SOUNDS)[number]['id']} SoundId */
/** @typedef {Partial<Record<SoundId, number>>} SavedMix */

/** @param {unknown} value @returns {value is number} */
function validLevel(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

/** @param {SavedMix} mix */
function levelsFor(mix) {
  return SOUNDS.map(({id}) => validLevel(mix[id]) ? Math.round(mix[id]) : 0);
}

/** @param {readonly number[]} levels @returns {SavedMix} */
function savedMix(levels) {
  return Object.fromEntries(SOUNDS.map(({id}, index) => [id, levels[index]]));
}

/** @param {unknown} value */
function restoreLevels(value) {
  if (Array.isArray(value)) {
    return validLevel(value[0]) && validLevel(value[1])
      ? levelsFor({rain: value[0], pink: value[1]})
      : null;
  }
  if (!value || typeof value !== 'object') return null;
  const mix = /** @type {SavedMix} */ (value);
  return SOUNDS.some(({id}) => validLevel(mix[id])) ? levelsFor(mix) : null;
}

const DEFAULT_LEVELS = Object.freeze(levelsFor(PRESETS[0].mix));

if (typeof module !== 'undefined') {
  module.exports = {SOUNDS, SOUND_GROUPS, PRESETS, DEFAULT_LEVELS, levelsFor, savedMix, restoreLevels, validLevel};
}
