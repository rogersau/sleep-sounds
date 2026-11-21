const $=id=>document.getElementById(id), tracks=['rain','pink'], player=$('mixAudio');
let starting=false,installPrompt,currentURL,mixKey='',revision=0;
try {readSavedMix(localStorage).forEach((v,i)=>$(tracks[i]).value=v)}catch{}

function values(){return tracks.map(x=>Number($(x).value))}
function applyMix(){const mix=values(),master=calculateMasterMix(mix,$('boost').value);tracks.forEach((name,i)=>$(name+'Value').value=mix[i]+'%');$('boostValue').value=$('boost').value+'%';$('boostNote').textContent=master.limited?'Headroom protection is active. The sound balance is unchanged.':'Raises the overall volume. Starts at 100% each time. Increase gradually.';try{localStorage.setItem(MIX_STORAGE_KEY,JSON.stringify(mix))}catch{}document.querySelectorAll('[data-mix]').forEach(b=>b.classList.toggle('selected',b.dataset.mix===mix.join(',')))}
function update(){const playing=!player.paused;$('playText').textContent=playing?'Pause soundscape':'Start listening';$('playIcon').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause soundscape':'Play soundscape');if('mediaSession'in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused'}
function pause(){revision++;player.pause();update();$('status').textContent='Paused. Your quiet place will be here.'}
async function prepareMix() {
  for (;;) {
    const levels = values(), boost = $('boost').value;
    const key = [...levels, boost].join(',');
    if (key === mixKey) return;
    const {volumes} = calculateMasterMix(levels, boost);
    const layers = await loadMixLayers(volumes);
    if (key !== [...values(), $('boost').value].join(',')) continue;
    const previous = currentURL;
    currentURL = URL.createObjectURL(makeNativeMix(layers, volumes));
    player.src = currentURL;
    player.load();
    mixKey = key;
    if (previous) URL.revokeObjectURL(previous);
    return;
  }
}
async function play(){if(starting)return;starting=true;const request=++revision;$('play').disabled=true;$('status').textContent='Preparing audio…';try{await prepareMix();if(request!==revision)return;await player.play();$('status').textContent='Playing a 32-minute native track. You can switch apps or lock your screen.'}catch{player.pause();$('status').textContent='Playback could not start. Check your connection, then tap play again.'}finally{starting=false;$('play').disabled=false;update()}}
async function changeMix(){applyMix();if(!player.paused){player.pause();await play()}}
for(const name of [...tracks,'boost']){$(name).addEventListener('input',applyMix);$(name).addEventListener('change',changeMix)}
document.querySelectorAll('[data-mix]').forEach(b=>b.onclick=()=>{b.dataset.mix.split(',').forEach((v,i)=>$(tracks[i]).value=v);changeMix()});applyMix();
$('play').onclick=()=>!player.paused?pause():play();player.addEventListener('play',update);player.addEventListener('pause',update);player.addEventListener('error',()=>{update();$('status').textContent='Audio was interrupted. Return here and tap play again.'});
if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:'Under the canopy',artist:'Sleep Sounds',album:'Under the canopy',artwork:[{src:'icon-512.png',sizes:'512x512',type:'image/png'}]});for(const [action,fn] of [['play',play],['pause',pause],['stop',pause]])try{navigator.mediaSession.setActionHandler(action,fn)}catch{}}
if('audioSession'in navigator)try{navigator.audioSession.type='playback'}catch{}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});window.addEventListener('appinstalled',()=>{$('install').textContent='✓ Installed';installPrompt=null});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null}else{$('help').open=true;$('help').scrollIntoView({behavior:'smooth'});$('status').textContent='Use your browser menu → Add to Home screen → Install.'}};
async function readyStatus(){const cache=await caches.open(CACHE);const found=await Promise.all(FILES.map(f=>cache.match(f)));if(found.every(Boolean)){$('offlineStatus').textContent='✓ Ready offline on this device. Keep this app open for background listening.';$('offline').textContent='✓ Saved offline'}}
let swReady;if('serviceWorker'in navigator){swReady=navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready);swReady.then(readyStatus).catch(()=>{$('offlineStatus').textContent='Offline mode is unavailable in this browser. Online playback still works.'})}else{$('offline').disabled=true;$('offlineStatus').textContent='Offline mode is unavailable in this browser.'}
$('offline').onclick=async()=>{const button=$('offline');button.disabled=true;button.textContent='Saving…';$('offlineStatus').textContent='Downloading both audio layers. Keep this page open.';try{if(!swReady)throw Error();await swReady;const cache=await caches.open(CACHE);for(let i=0;i<FILES.length;i++){const response=await fetch(FILES[i],{cache:'reload'});if(!response.ok||response.status!==200)throw Error();await cache.put(FILES[i],response);$('offlineStatus').textContent=`Saving offline: ${i+1} of ${FILES.length} files…`}await readyStatus()}catch{$('offlineStatus').textContent='Offline save did not complete. Check your connection and available storage, then try again.';button.textContent='↓ Retry offline save'}finally{button.disabled=false}};
