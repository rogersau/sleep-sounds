importScripts('sound-library.js?v=8', 'player-config.js?v=13');
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(path=>new Request(new URL(path,self.location.href),{cache:"reload"})))).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  const current = await caches.open(CACHE);
  for (const key of PREVIOUS_CACHES.filter(name => keys.includes(name))) {
    const previous = await caches.open(key);
    for (const path of Object.values(AUDIO_FILES)) {
      const cached = await previous.match(path);
      if (cached && !await current.match(path)) await current.put(path, cached);
    }
  }
  await Promise.all(keys.filter(key => key.startsWith('forest-rain-') && key !== CACHE)
    .map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate'){try{const response=await fetch(event.request);if(response.ok)return response}catch{}return await cache.match('./')||Response.error()}const cached=await cache.match(event.request.url);if(cached){const range=event.request.headers.get('range');if(range&&new URL(event.request.url).pathname.endsWith('.wav')){const bytes=await cached.arrayBuffer();const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start=0,end=bytes.byteLength-1;if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end)}else if(match[2])start=Math.max(0,bytes.byteLength-Number(match[2]));if(start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/wav','Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Accept-Ranges':'bytes'}})}return cached}try{return await fetch(event.request)}catch(err){return Response.error()}})())});
