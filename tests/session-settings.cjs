const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  DEFAULT_TIMER, restoreTimerSettings, formatRemaining, cleanMixName, restorePersonalMixes,
  serializePersonalMixes, favoritesFirst,
} = require('../dist/session-settings.js');

test('restores valid timer settings and rejects invalid controls', () => {
  assert.deepEqual(restoreTimerSettings(null), DEFAULT_TIMER);
  assert.deepEqual(restoreTimerSettings({ minutes: 90, fadeSeconds: 15 }), { minutes: 90, fadeSeconds: 15 });
  assert.deepEqual(restoreTimerSettings({ minutes: 61, fadeSeconds: '60' }), DEFAULT_TIMER);
  assert.equal(formatRemaining(61.2), '1:02');
  assert.equal(formatRemaining(3660), '1:01:00');
  assert.equal(formatRemaining(-1), '0:00');
});

test('round-trips mix levels, boost and favorites by sound ID', () => {
  const mixes = restorePersonalMixes([
    { name: ' Coast ', levels: { ocean: 80, brown: 22 }, boost: 120 },
    { name: 'Fireside', levels: { fireplace: 60, pink: 30 }, boost: 145, favorite: true },
    { name: 'COAST', levels: { rain: 80 } },
    { name: 'Silent', levels: { ocean: 0 } },
    { name: 'Invalid', levels: {}, boost: 900 },
  ]);
  assert.deepEqual(mixes.map(mix => mix.name), ['Coast', 'Fireside']);
  assert.deepEqual(favoritesFirst(mixes).map(mix => mix.name), ['Fireside', 'Coast']);
  assert.equal(mixes[0].boost, 120);
  assert.deepEqual(restorePersonalMixes(serializePersonalMixes(mixes)), mixes);
  assert.equal(cleanMixName('  '), '');
  assert.equal(cleanMixName('x'.repeat(80)).length, 40);
});
