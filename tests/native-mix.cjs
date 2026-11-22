const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const calls = [];
const ctx = vm.createContext({
  Blob, Int16Array, ArrayBuffer, DataView, Math, Promise, Error, Uint8Array, String,
  fetch: async file => {
    calls.push(file);
    return {ok: true, arrayBuffer: async () => {
      const b = fs.readFileSync('dist/' + file.split('?')[0]);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    }};
  },
});
for (const file of ['sound-library.js', 'player-config.js', 'native-mix.js']) {
  vm.runInContext(fs.readFileSync('dist/' + file, 'utf8'), ctx);
}
(async () => {
  const solo = await vm.runInContext('loadMixLayers([0.7,0])', ctx);
  assert.deepEqual(calls, ['rain.wav?v=6']);
  assert.equal(solo[1], null);
  ctx.solo = solo;
  const rainOnly = vm.runInContext('makeNativeMix(solo,[0.7,0])', ctx);
  const rainSamples = new Int16Array(await rainOnly.slice(44, 444).arrayBuffer());
  for (let i = 0; i < rainSamples.length; i++) {
    assert.equal(rainSamples[i], Math.round(solo[0][i] * .7) || 0);
  }
  const layers = await vm.runInContext('loadMixLayers([0.7,0.4])', ctx);
  assert.deepEqual(calls, ['rain.wav?v=6', 'pink.wav?v=6']);
  await vm.runInContext('loadMixLayers([0.9,0])', ctx);
  assert.deepEqual(calls, ['rain.wav?v=6', 'pink.wav?v=6']);
  assert.equal(layers[0].length, 128 * 24000 * 2);
  ctx.layers = layers;
  const blob = vm.runInContext('makeNativeMix(layers,[0.7,0.4])', ctx);
  assert.equal(blob.size, 44 + 15 * layers[0].byteLength);
  const h = new DataView(await blob.slice(0, 44).arrayBuffer());
  assert.equal(h.getUint32(40, true), blob.size - 44);
  assert.equal(h.getUint32(24, true), 24000);
  assert.equal((blob.size - 44) / 96000, 1920);
  const cycle = layers[0].byteLength;
  const beginning = new Uint8Array(await blob.slice(44, 444).arrayBuffer());
  const ending = new Uint8Array(await blob.slice(44 + cycle - 400, 44 + cycle).arrayBuffer());
  for (let k = 1; k < 15; k++) {
    const boundary = 44 + k * cycle;
    assert.deepEqual(new Uint8Array(await blob.slice(boundary - 400, boundary).arrayBuffer()), ending);
    assert.deepEqual(new Uint8Array(await blob.slice(boundary, boundary + 400).arrayBuffer()), beginning);
  }
  const sample = new Int16Array(await blob.slice(44, 444).arrayBuffer());
  for (let i = 0; i < sample.length; i++) {
    assert.equal(sample[i], Math.round(layers[0][i] * .7 + layers[1][i] * .4) || 0);
  }

  const oceanOnly = await vm.runInContext('loadMixLayers([0,0,0.7])', ctx);
  assert.deepEqual(calls, ['rain.wav?v=6', 'pink.wav?v=6', 'ocean.wav?v=8']);
  assert.equal(oceanOnly[0], null);
  const ocean = oceanOnly[2];
  assert.equal(ocean.length, 64 * 24000 * 2);
  ctx.oceanOnly = oceanOnly;
  const fallback = vm.runInContext('makeNativeMix(oceanOnly,[0,0,0.7])', ctx);
  const boundary = 44 + ocean.byteLength;
  const repeated = new Int16Array(await fallback.slice(boundary - 4, boundary + 4).arrayBuffer());
  const samples = [ocean.at(-2), ocean.at(-1), ocean[0], ocean[1]].map(v => Math.round(v * 0.7) || 0);
  assert.deepEqual(Array.from(repeated), samples);
  assert.equal(fallback.size, blob.size);
  const timed = vm.runInContext('makeNativeMix(solo,[0.7,0], {seconds: 3, fadeSeconds: 1})', ctx);
  assert.equal(timed.size, 44 + 3 * 96000);
  const fadeStarts = 2 * 24000;
  const midway = fadeStarts + 12000;
  const wet = new Int16Array(await timed.slice(44 + midway * 4, 44 + midway * 4 + 4).arrayBuffer());
  const midGain = 11999 / 23999;
  const expected = Array.from(solo[0].slice(midway * 2, midway * 2 + 2))
    .map(sample => Math.round(Math.round(sample * 0.7) * midGain) || 0);
  assert.deepEqual(Array.from(wet), expected);
  assert.deepEqual(Array.from(new Int16Array(await timed.slice(-4).arrayBuffer())), [0, 0]);
  const longest = vm.runInContext('makeNativeMix(solo,[0.7,0], {seconds: 7200, fadeSeconds: 60})', ctx);
  assert.equal(longest.size, 44 + 7200 * 96000);
  assert.equal(new DataView(await longest.slice(40, 44).arrayBuffer()).getUint32(0, true), longest.size - 44);
  console.log('PASS: mix loads only selected sounds, loops shorter recordings inside the native track, and inserts no padding.');
  console.log('PASS: Screen-off timer writes a finite WAV and fades to a zero-valued last frame.');
})().catch(e => {console.error(e); process.exitCode = 1;});
