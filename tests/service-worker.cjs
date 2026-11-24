const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const handlers = new Map(), contents = new Map(), loads = [], removed = [];
const root = 'https://example.test/app/';
let online = true;
const getURL = key => new URL(typeof key === 'string' ? key : key.url, root).href;
const previousAudio = new Map([
  ['forest-rain-v15', new Map()],
  ['forest-rain-v14', new Map()],
  ['forest-rain-v13', new Map([[getURL('white.wav?v=8'), 'white-noise']])],
  ['forest-rain-v12', new Map()],
  ['forest-rain-v11', new Map()],
  ['forest-rain-v10', new Map([[getURL('fireplace.wav?v=8'), 'crackles']])],
  ['forest-rain-v9', new Map([[getURL('ocean.wav?v=8'), 'ocean-surf']])],
  ['forest-rain-v8', new Map([[getURL('brown.wav?v=8'), 'brown-noise']])],
  ['forest-rain-v7', new Map([[getURL('rain.wav?v=6'), 'acoustic-rain']])],
  ['forest-rain-v6', new Map([[getURL('pink.wav?v=6'), 'pink-noise']])],
]);
const cache = {
  addAll: async requests => {
    for (const request of requests) {
      assert.equal(request.cache, 'reload');
      loads.push(request.url);
      contents.set(request.url, request.url);
    }
  },
  match: async key => contents.has(getURL(key)) ? new Response(contents.get(getURL(key))) : undefined,
  put: async (key, response) => contents.set(getURL(key), await response.text()),
};
const ctx = vm.createContext({
  Request, Response, URL,
  caches: {
    open: async key => {
      if (previousAudio.has(key)) {
        const files = previousAudio.get(key);
        return {match: async path => files.has(getURL(path)) ? new Response(files.get(getURL(path))) : undefined};
      }
      assert.equal(key, 'forest-rain-v16');
      return cache;
    },
    keys: async () => ['forest-rain-v5', ...[...previousAudio.keys()].reverse(), 'forest-rain-v16', 'other-app'],
    delete: async key => {
      previousAudio.delete(key);
      removed.push(key);
    },
  },
  self: {
    location: new URL('sw.js', root),
    addEventListener: (type, handler) => handlers.set(type, handler),
    skipWaiting: async () => {},
    clients: {claim: async () => {}},
  },
  fetch: async request => {
    if (!online) throw Error('offline');
    return new Response('fresh:' + request.url);
  },
});
ctx.importScripts = (...paths) => paths.forEach(path => vm.runInContext(fs.readFileSync('dist/' + path.split('?')[0], 'utf8'), ctx));
vm.runInContext(fs.readFileSync('dist/sw.js', 'utf8'), ctx);
function event(type, props = {}) {
  return new Promise((resolve, reject) => {
    const complete = value => Promise.resolve(value).then(resolve, reject);
    handlers.get(type)({waitUntil: complete, respondWith: complete, ...props});
  });
}
function request(path, mode, headers = {}) {
  return event('fetch', {request: {url: getURL(path), mode, method: 'GET', headers: new Headers(headers)}});
}
(async () => {
  await event('install');
  assert.ok(loads.includes(getURL('app.js?v=13')));
  assert.ok(loads.includes(getURL('style.css?v=15')));
  assert.ok(loads.includes(getURL('gapless-player.js?v=9')));
  assert.ok(loads.includes(getURL('sound-library.js?v=15')));
  assert.ok(loads.includes(getURL('audio-sleep-timer.js?v=9')));
  assert.ok(loads.includes(getURL('saved-mixes.js?v=10')));
  assert.ok(!loads.includes(getURL('rain.wav?v=6')), 'install must not silently download audio');
  assert.ok(!loads.includes(getURL('ocean.wav?v=8')), 'install must not silently download new audio');
  assert.ok(!loads.includes(getURL('train.wav?v=14')), 'install fetches the shell only');
  await event('activate');
  assert.deepEqual(removed, ['forest-rain-v5', 'forest-rain-v6', 'forest-rain-v7', 'forest-rain-v8', 'forest-rain-v9', 'forest-rain-v10', 'forest-rain-v11', 'forest-rain-v12', 'forest-rain-v13', 'forest-rain-v14', 'forest-rain-v15']);
  assert.equal(await (await request('./', 'navigate')).text(), 'fresh:' + root);
  online = false;
  assert.equal(await (await request('./', 'navigate')).text(), root);
  assert.equal(await (await request('rain.wav?v=6', 'same-origin')).text(), 'acoustic-rain');
  assert.equal(await (await request('pink.wav?v=6', 'same-origin')).text(), 'pink-noise');
  assert.equal(await (await request('brown.wav?v=8', 'same-origin')).text(), 'brown-noise');
  assert.equal(await (await request('ocean.wav?v=8', 'same-origin')).text(), 'ocean-surf');
  assert.equal(await (await request('fireplace.wav?v=8', 'same-origin')).text(), 'crackles');
  assert.equal(await (await request('white.wav?v=8', 'same-origin')).text(), 'white-noise');
  const range = await request('rain.wav?v=6', 'same-origin', {range: 'bytes=0-7'});
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('Content-Range'), 'bytes 0-7/13');
  assert.equal(await range.text(), 'acoustic');
  const old = await request('rain.wav', 'same-origin');
  assert.equal(old.type, 'error');
  console.log('PASS: current shell installed; previous audio preserved offline with partial byte-range support.');
})().catch(e => {console.error(e); process.exitCode = 1;});
