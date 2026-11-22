const PLAYER_VERSION = '13';
const CACHE = 'forest-rain-v' + PLAYER_VERSION;
const PREVIOUS_CACHES = ['forest-rain-v12', 'forest-rain-v11', 'forest-rain-v10', 'forest-rain-v9', 'forest-rain-v8', 'forest-rain-v7', 'forest-rain-v6'];
const AUDIO_FILES = Object.freeze(Object.fromEntries(
  SOUNDS.map(({id, version}) => [id, id + '.wav?v=' + version])
));
const SHELL = ['./', 'index.html', 'style.css?v=13', 'sound-library.js?v=8',
  'player-config.js?v=13', 'app.js?v=11', 'gapless-player.js?v=9', 'session-settings.js?v=9',
  'audio-sleep-timer.js?v=9', 'saved-mixes.js?v=10', 'native-mix.js?v=9',
  'master-mix.js?v=8', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png'];
const FILES = [...SHELL, ...Object.values(AUDIO_FILES)];
const MIX_STORAGE_KEY = 'sleepSoundsMixV8';
function readSavedMix(storage) {
  for (const key of [MIX_STORAGE_KEY, 'forestMixV6', 'forestMix']) {
    try {
      const saved = JSON.parse(storage.getItem(key));
      if (key === 'forestMix') {
        if (Array.isArray(saved) && validLevel(saved[0])) return levelsFor({rain: saved[0] || 70});
      } else {
        const levels = restoreLevels(saved);
        if (levels) return levels;
      }
    } catch {}
  }
  return DEFAULT_LEVELS.slice();
}
