const PLAYER_VERSION = '6';
const CACHE = 'forest-rain-v' + PLAYER_VERSION;
const AUDIO_FILES = Object.freeze({
  rain: 'rain.wav?v=' + PLAYER_VERSION,
  pink: 'pink.wav?v=' + PLAYER_VERSION
});
const SHELL = ['./', 'index.html', 'style.css', 'player-config.js?v=6', 'app.js?v=6',
  'native-mix.js?v=6', 'master-mix.js?v=6', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png'];
const FILES = [...SHELL, ...Object.values(AUDIO_FILES)];
const MIX_STORAGE_KEY = 'forestMixV6';
function readSavedMix(storage) {
  const valid = v => Number.isFinite(v) && v >= 0 && v <= 100;
  try {
    const current = JSON.parse(storage.getItem(MIX_STORAGE_KEY));
    if (Array.isArray(current) && valid(current[0]) && valid(current[1])) {
      return current.slice(0, 2);
    }
    const previous = JSON.parse(storage.getItem('forestMix'));
    if (Array.isArray(previous) && valid(previous[0])) return [previous[0] || 70, 0];
  } catch {}
  return [70, 0];
}
