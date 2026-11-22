const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AudioSleepTimer } = require('../dist/audio-sleep-timer.js');

function clockFixture() {
  const automation = [];
  const signals = [];
  const output = { gain: {
    cancelScheduledValues: when => automation.push(['cancel', when]),
    setValueAtTime: (value, when) => automation.push(['set', value, when]),
    linearRampToValueAtTime: (value, when) => automation.push(['ramp', value, when]),
  }};
  const clock = {
    currentTime: 0,
    createConstantSource() {
      const signal = { offset: {value: 1}, connect() {}, disconnect() {},
        start(when) { this.started = when; }, stop(when) { this.stopped = when; },
      };
      signals.push(signal);
      return signal;
    },
  };
  return { clock, automation, signals, timer: new AudioSleepTimer(clock, output) };
}

test('the audio clock schedules the entire fade and stops at zero', () => {
  const { clock, automation, signals, timer } = clockFixture();
  let finished = 0;
  timer.schedule(30, 10, () => finished++);
  assert.deepEqual(automation, [['cancel', 0], ['set', 1, 0], ['set', 1, 20], ['ramp', 0, 30]]);
  assert.equal(signals[0].offset.value, 0);
  assert.equal(signals[0].stopped, 30);
  clock.currentTime = 25;
  assert.equal(timer.remaining, 5);
  assert.equal(timer.levelAt(25), 0.5);
  clock.currentTime = 30;
  assert.equal(timer.levelAt(30), 0);
  signals[0].onended();
  assert.equal(finished, 1);
  assert.equal(timer.remaining, 0);
});

test('cancelling during a fade restores volume without an abrupt jump', () => {
  const { clock, automation, signals, timer } = clockFixture();
  let finished = false;
  timer.schedule(30, 10, () => { finished = true; });
  const stale = signals[0].onended;
  clock.currentTime = 25;
  timer.schedule(0, 0);
  assert.deepEqual(automation.slice(-3), [['cancel', 25], ['set', 0.5, 25], ['ramp', 1, 25.05]]);
  stale();
  assert.ok(!finished);
  assert.equal(timer.remaining, null);
  assert.equal(timer.levelAt(25.1), 1);
});
