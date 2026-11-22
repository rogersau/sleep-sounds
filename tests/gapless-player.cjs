const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

function playerFixture() {
  const loaded = [];
  const sources = [];
  const gains = [];
  class Context {
    state = 'suspended';
    currentTime = 0;
    destination = {};

    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }

    createBuffer(channels, frames, rate) {
      const samples = Array.from({ length: channels }, () => new Float32Array(frames));
      return { duration: frames / rate, getChannelData: channel => samples[channel] };
    }

    createBufferSource() {
      const source = {
        connect() {},
        start(...args) { this.started = args; },
      };
      sources.push(source);
      return source;
    }

    createGain() {
      const gain = {
        value: 1,
        targets: [],
        cancelScheduledValues() {},
        setTargetAtTime(volume, when, fade) { this.targets.push({ volume, when, fade }); },
      };
      gains.push(gain);
      return { gain, connect() {} };
    }
  }
  const GaplessPlayer = vm.runInNewContext(
    fs.readFileSync('dist/sound-library.js', 'utf8') + '\n' +
    fs.readFileSync('dist/audio-sleep-timer.js', 'utf8') + '\n' +
    fs.readFileSync('dist/gapless-player.js', 'utf8') + '\nGaplessPlayer',
    { SAMPLE_RATE: 24000, loadLayer: async name => {
      loaded.push(name);
      const pcm = new Int16Array((name === 'ocean' ? 3 : 6) * 24000 * 2);
      pcm[0] = 8192;
      pcm[1] = -8192;
      return pcm;
    } },
  );
  return { player: new GaplessPlayer(Context, () => {}), loaded, sources, gains };
}

test('rain is a continuous stereo loop and gain changes retain the running source', async () => {
  const { player, loaded, sources, gains } = playerFixture();
  await player.play([0.46, 0]);
  assert.ok(player.playing);
  assert.deepEqual(loaded, ['rain']);
  assert.equal(sources[0].loop, true);
  assert.deepEqual(sources[0].started, [0.05, 0]);
  assert.equal(sources[0].buffer.getChannelData(0)[0], 0.25);
  assert.equal(sources[0].buffer.getChannelData(1)[0], -0.25);

  player.context.currentTime = 19;
  await player.setMix([0.6, 0]);
  assert.equal(sources.length, 1);
  assert.deepEqual(gains.at(-1).targets.at(-1), { volume: 0.6, when: 19, fade: 0.02 });
  await player.pause();
  assert.ok(!player.playing);
  await player.play([0.6, 0]);
  assert.ok(player.playing);
  assert.equal(sources.length, 1);
});

test('an ocean loop joins the playing mix at its own phase', async () => {
  const { player, loaded, sources, gains } = playerFixture();
  await player.play([0.46, 0]);
  player.context.currentTime = 22;
  await player.setMix([0.4, 0, 0.3]);
  assert.deepEqual(loaded, ['rain', 'ocean']);
  const [when, offset] = sources[1].started;
  assert.equal(sources[1].loop, true);
  assert.ok(Math.abs(offset - 1) < 1 / 24000);
  assert.equal(gains.at(-1).targets[0].when, when);

  player.context.currentTime++;
  await player.setMix([0.6, 0, 0]);
  assert.equal(sources.length, 2);
  assert.equal(gains.at(-1).targets.at(-1).volume, 0);
});

test('a standalone sound never loads rain or pink noise', async () => {
  const { player, loaded, sources } = playerFixture();
  await player.play([0, 0, 0.46]);
  assert.ok(player.playing);
  assert.deepEqual(loaded, ['ocean']);
  assert.equal(sources.length, 1);
});
