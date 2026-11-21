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
for (const file of ['player-config.js', 'native-mix.js']) {
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
  console.log('PASS: rain-only never fetches or mixes pink noise; explicit opt-in loads it; one 1920-second native WAV, correct blend and no padding at all 14 internal joins.');
})().catch(e => {console.error(e); process.exitCode = 1;});
