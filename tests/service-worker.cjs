const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const handlers = new Map(), contents = new Map(), loads = [], removed = [];
const root = 'https://example.test/app/';
let online = true;
const getURL = key => new URL(typeof key === 'string' ? key : key.url, root).href;
const cache = {
  addAll: async requests => {
    for (const request of requests) {
      assert.equal(request.cache, 'reload');
      loads.push(request.url);
      contents.set(request.url, request.url);
    }
  },
  match: async key => contents.has(getURL(key)) ? new Response(contents.get(getURL(key))) : undefined,
};
const ctx = vm.createContext({
  Request, Response, URL,
  caches: {
    open: async key => { assert.equal(key, 'forest-rain-v6'); return cache; },
    keys: async () => ['forest-rain-v5', 'forest-rain-v6', 'other-app'],
    delete: async key => removed.push(key),
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
ctx.importScripts = path => vm.runInContext(fs.readFileSync('dist/' + path.split('?')[0], 'utf8'), ctx);
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
  assert.ok(loads.includes(getURL('app.js?v=6')));
  assert.ok(!loads.includes(getURL('rain.wav?v=6')), 'install must not silently download audio');
  await event('activate');
  assert.deepEqual(removed, ['forest-rain-v5']);
  assert.equal(await (await request('./', 'navigate')).text(), 'fresh:' + root);
  contents.set(getURL('rain.wav?v=6'), 'acoustic-rain');
  online = false;
  assert.equal(await (await request('./', 'navigate')).text(), root);
  assert.equal(await (await request('rain.wav?v=6', 'same-origin')).text(), 'acoustic-rain');
  const range = await request('rain.wav?v=6', 'same-origin', {range: 'bytes=0-7'});
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('Content-Range'), 'bytes 0-7/13');
  assert.equal(await range.text(), 'acoustic');
  const old = await request('rain.wav', 'same-origin');
  assert.equal(old.type, 'error');
  console.log('PASS: shell refresh bypasses stale HTTP cache; v5 cache replaced; offline v6 shell, exact versioned audio and partial byte range work in simulated service worker.');
})().catch(e => {console.error(e); process.exitCode = 1;});
