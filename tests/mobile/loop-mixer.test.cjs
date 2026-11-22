const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

const { LoopMixer } = require('../../mobile/loopMixer.ts');
const { masterMix } = require('../../mobile/mix.ts');

const webMasterMix = vm.runInNewContext(
  fs.readFileSync('dist/master-mix.js', 'utf8') + '\ncalculateMasterMix',
);

test('native gains retain the web mix and its headroom', () => {
  for (const levels of [[70, 0, 0], [90, 0, 0], [70, 40, 0], [100, 100, 100], [0, 0, 0], [0, 0, 90]]) {
    for (const boost of [100, 125, 150]) {
      const actual = masterMix(levels, boost);
      const expected = webMasterMix(levels, boost);
      assert.deepEqual(actual.volumes, Array.from(expected.volumes));
      assert.equal(actual.limited, expected.limited);
    }
  }
});

function audioGraph() {
  const sources = [];
  const gains = [];
  const context = {
    sampleRate: 24_000,
    currentTime: 0,
    createBufferSource() {
      const source = {
        connect() {},
        start(...args) { this.started = args; },
      };
      sources.push(source);
      return source;
    },
    createGain() {
      const events = [];
      const node = {
        events,
        gain: {
          value: 1,
          cancelAndHoldAtTime(when) {
            events.push({ when });
            return this;
          },
          linearRampToValueAtTime(volume, when) {
            events.push({ volume, when });
          },
        },
        connect() {},
      };
      gains.push(node);
      return node;
    },
  };
  return { context, sources, gains };
}

const rain = { length: 128 * 24_000, duration: 128 };
const ocean = { length: 64 * 24_000, duration: 64 };

test('rain loops natively and volume changes keep the same source running', () => {
  const { context, sources, gains } = audioGraph();
  const mixer = new LoopMixer(context);
  mixer.setMix([0.47, 0], [rain]);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].loop, true);
  assert.equal(sources[0].loopEnd, rain.duration);
  assert.equal(sources[0].started.length, 2);

  context.currentTime = 260;
  mixer.setMix([0.6, 0], [rain]);
  assert.equal(sources.length, 1);
  assert.deepEqual(gains.at(-1).events.slice(-2), [{ when: 260 }, { volume: 0.6, when: 260.06 }]);
});

test('a shorter source joins on its own phase after rain has wrapped', () => {
  const { context, sources, gains } = audioGraph();
  const mixer = new LoopMixer(context);
  mixer.setMix([0.47, 0, 0], [rain]);
  context.currentTime = 3 * rain.duration + 71;
  mixer.setMix([0.4, 0, 0.3], [rain, undefined, ocean]);

  assert.equal(sources.length, 2);
  const [rainStart] = sources[0].started;
  const [oceanStart, oceanOffset] = sources[1].started;
  const frameOffset = Math.round((oceanStart - rainStart) * context.sampleRate) % ocean.length;
  assert.equal(oceanOffset * context.sampleRate, frameOffset);
  assert.equal(sources[1].loop, true);
  assert.equal(sources[1].loopEnd, ocean.duration);
  assert.equal(gains.at(-1).gain.value, 0);
  assert.deepEqual(gains.at(-1).events, [{ when: oceanStart }, { volume: 0.3, when: oceanStart + 0.06 }]);

  context.currentTime++;
  mixer.setMix([0.6, 0, 0], [rain]);
  assert.equal(sources.length, 2);
  assert.equal(gains.at(-1).events.at(-1).volume, 0);
});
