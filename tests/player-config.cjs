const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const config = fs.readFileSync('dist/player-config.js', 'utf8');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('dist/sound-library.js', 'utf8'), ctx);
vm.runInContext(config, ctx);
function settings(old = {}, expected) {
  ctx.storage = {getItem: k => old[k] ?? null};
  assert.deepEqual(Array.from(vm.runInContext('readSavedMix(storage)', ctx)),
    Array.from({length: 10}, (_, index) => expected[index] ?? 0));
}
settings({}, [70, 0]);
settings({forestMix: '[82,40]'}, [82, 0]);
settings({forestMix: '[0,65]'}, [70, 0]);
settings({forestMix: '[101,65]'}, [70, 0]);
settings({forestMix: '[70,40]', forestMixV6: '[66,15]'}, [66, 15]);
settings({forestMix: '[70,40]', forestMixV6: '[0,0]'}, [0, 0]);
settings({forestMix: 'invalid'}, [70, 0]);
settings({forestMix: '[73,40]', forestMixV6: '[110,120]'}, [73, 0]);
settings({sleepSoundsMixV8: '{"ocean":65,"brown":25,"rain":0}'}, [0, 0, 65, 0, 0, 25]);
settings({sleepSoundsMixV8: '{"airplane":60,"train":35,"coffee-shop":20}'}, [0, 0, 0, 0, 0, 0, 0, 60, 35, 20]);
settings({sleepSoundsMixV8: '{}', forestMixV6: '[66,15]'}, [66, 15]);
settings({sleepSoundsMixV8: 'invalid', forestMixV6: '[66,15]'}, [66, 15]);

const html = fs.readFileSync('dist/index.html', 'utf8');
assert.match(html, /id="soundControl"/);
assert.match(html, /id="soundPresets"/);
assert.match(html, /id="soundFilters"/);
const library = vm.runInContext('({SOUNDS, SOUND_GROUPS, PRESETS, levelsFor})', ctx);
assert.deepEqual(Array.from(library.SOUND_GROUPS), ['Nature', 'Ambience', 'Noise']);
assert.deepEqual(Array.from(library.SOUND_GROUPS.map(group => library.SOUNDS.filter(sound => sound.group === group).length)), [4, 3, 3]);
for (const id of ['cabin', 'cafe', 'train', 'rain-cafe']) {
  assert.ok(library.PRESETS.some(preset => preset.id === id), 'Missing ambience preset: ' + id);
}
assert.deepEqual(Array.from(library.levelsFor(library.PRESETS.find(preset => preset.id === 'rain-cafe').mix)), [60, 0, 0, 0, 0, 0, 0, 0, 0, 25]);
const plan = vm.runInContext('({CACHE, SHELL, FILES})', ctx);
assert.equal(plan.CACHE, 'forest-rain-v17');
const references = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
for (const ref of references) assert.ok(plan.SHELL.includes(ref), 'Uncached script: ' + ref);
assert.ok(plan.FILES.includes('rain.wav?v=6'));
assert.ok(plan.FILES.includes('pink.wav?v=6'));
for (const id of ['airplane', 'train', 'coffee-shop']) assert.ok(plan.FILES.includes(id + '.wav?v=14'));
assert.equal(new Set(plan.FILES).size, plan.FILES.length);
const sw = fs.readFileSync('dist/sw.js', 'utf8');
assert.match(sw, /importScripts\('sound-library\.js\?v=15', 'player-config\.js\?v=17'\)/);
for (const file of plan.FILES) assert.ok(fs.existsSync('dist/' + file.split('?')[0]), file);
console.log('PASS: clean defaults, safe legacy migration, explicit new opt-in persistence and shared versioned offline cache plan.');
