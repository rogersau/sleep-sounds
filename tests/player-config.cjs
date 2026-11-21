const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const config = fs.readFileSync('dist/player-config.js', 'utf8');
const ctx = vm.createContext({});
vm.runInContext(config, ctx);
function settings(old = {}, expected) {
  ctx.storage = {getItem: k => old[k] ?? null};
  assert.deepEqual(Array.from(vm.runInContext('readSavedMix(storage)', ctx)), expected);
}
settings({}, [70, 0]);
settings({forestMix: '[82,40]'}, [82, 0]);
settings({forestMix: '[0,65]'}, [70, 0]);
settings({forestMix: '[101,65]'}, [70, 0]);
settings({forestMix: '[70,40]', forestMixV6: '[66,15]'}, [66, 15]);
settings({forestMix: '[70,40]', forestMixV6: '[0,0]'}, [0, 0]);
settings({forestMix: 'invalid'}, [70, 0]);
settings({forestMix: '[73,40]', forestMixV6: '[110,120]'}, [73, 0]);

const html = fs.readFileSync('dist/index.html', 'utf8');
assert.match(html, /id="pink"[^>]*value="0"/);
assert.match(html, /data-mix="70,0"[^>]*>Rain only/);
const plan = vm.runInContext('({CACHE, SHELL, FILES})', ctx);
assert.equal(plan.CACHE, 'forest-rain-v6');
const references = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
for (const ref of references) assert.ok(plan.SHELL.includes(ref), 'Uncached script: ' + ref);
assert.ok(plan.FILES.includes('rain.wav?v=6'));
assert.ok(plan.FILES.includes('pink.wav?v=6'));
assert.equal(new Set(plan.FILES).size, plan.FILES.length);
const sw = fs.readFileSync('dist/sw.js', 'utf8');
assert.match(sw, /importScripts\('player-config\.js\?v=6'\)/);
for (const file of plan.FILES) assert.ok(fs.existsSync('dist/' + file.split('?')[0]), file);
console.log('PASS: clean defaults, safe legacy migration, explicit new opt-in persistence and shared versioned offline cache plan.');
