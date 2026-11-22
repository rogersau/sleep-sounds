const $ = id => document.getElementById(id);
const tracks = SOUNDS.map(sound => sound.id);
const soundTiles = new Map();
const player = $('mixAudio');
const modeControl = $('playbackMode');
const Context = window.AudioContext || window.webkitAudioContext;
const gapless = Context ? new GaplessPlayer(Context, updatePlayback) : null;
let starting = false, installPrompt, currentURL, mixKey = '', revision = 0;
const TIMER_STORAGE_KEY = 'sleepSoundsTimer';
const presetLabels = {
  rain: 'Rain', coast: 'Ocean', fireside: 'Fireplace', creek: 'Stream', dark: 'Brown noise',
  'rain-pink': 'Rain + pink',
};
let timerSettings = DEFAULT_TIMER;
let screenOffSeconds = null;
let countdown;
let refreshSavedMixes;

function renderSoundOptions() {
  const sounds = SOUND_GROUPS.flatMap(group => SOUNDS.filter(sound => sound.group === group));
  for (const {id, title} of sounds) {
    const fragment = $('soundControl').content.cloneNode(true);
    const button = fragment.querySelector('button');
    const input = fragment.querySelector('input');
    const levelText = fragment.querySelector('.sound-level');
    const meter = fragment.querySelector('.sound-meter');
    const preset = PRESETS.find(({mix}) => mix[id] > 0);
    const tile = {button, input, levelText, lastLevel: preset?.mix[id] ?? 60};
    fragment.querySelector('.sound-name').textContent = title;
    input.id = id;
    input.setAttribute('aria-label', title + ' volume');
    bindSoundTile(tile, meter);
    soundTiles.set(id, tile);
    $('soundLibrary').append(fragment);
  }

  for (const {id, title, mix} of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = presetLabels[id] ?? title;
    button.dataset.preset = id;
    button.dataset.mix = levelsFor(mix).join(',');
    $('soundPresets').append(button);
  }

  for (const sound of SOUNDS.filter(item => item.source)) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = sound.source;
    link.textContent = sound.title + ' · ' + sound.credit;
    item.append(link);
    $('audioCredits').append(item);
  }
}

function bindSoundTile(tile, meter) {
  const {button, input} = tile;
  let gesture;
  let suppressClick = false;

  function setLevel(level) {
    if (Number(input.value) === level) return;
    input.value = level;
    input.dispatchEvent(new Event('input'));
  }

  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || input.disabled) return;
    suppressClick = false;
    gesture = {
      id: event.pointerId, x: event.clientX, y: event.clientY, initialLevel: input.value,
      lastLevel: tile.lastLevel, bounds: meter.getBoundingClientRect(), dragging: false,
    };
    button.setPointerCapture(event.pointerId);
  });

  function drag(event) {
    if (gesture?.id !== event.pointerId || input.disabled) return;
    const dx = Math.abs(event.clientX - gesture.x);
    const dy = Math.abs(event.clientY - gesture.y);
    if (!gesture.dragging && (dx < 8 || dx <= dy)) return;
    gesture.dragging = true;
    suppressClick = true;
    const {left, width} = gesture.bounds;
    const fraction = Math.max(0, Math.min(1, (event.clientX - left) / width));
    setLevel(Math.round(fraction * 100));
  }

  function finish(event) {
    if (gesture?.id !== event.pointerId) return;
    const {dragging, initialLevel, lastLevel} = gesture;
    gesture = undefined;
    if (event.type !== 'pointerup') suppressClick = true;
    if (!dragging) return;
    if (input.value === '0') tile.lastLevel = lastLevel;
    if (input.value !== initialLevel && !input.disabled) input.dispatchEvent(new Event('change'));
  }

  button.addEventListener('pointermove', drag);
  button.addEventListener('pointerup', event => {
    drag(event);
    finish(event);
  });
  button.addEventListener('pointercancel', finish);
  button.addEventListener('lostpointercapture', finish);
  button.addEventListener('click', event => {
    if (input.disabled || (suppressClick && event.detail > 0)) return;
    setLevel(Number(input.value) > 0 ? 0 : tile.lastLevel);
    input.dispatchEvent(new Event('change'));
  });
}

renderSoundOptions();
DEFAULT_LEVELS.forEach((value, index) => $(tracks[index]).value = value);
try {
  readSavedMix(localStorage).forEach((value, index) => $(tracks[index]).value = value);
  if (localStorage.getItem('forestPlaybackMode') === 'screen-off') modeControl.value = 'screen-off';
  timerSettings = restoreTimerSettings(JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY)));
} catch {}
if (!gapless) {
  modeControl.querySelector('option[value="gapless"]').disabled = true;
  modeControl.value = 'screen-off';
}

function values() {
  return tracks.map(name => Number($(name).value));
}

function applyMix() {
  const mix = values();
  const master = calculateMasterMix(mix, $('boost').value);
  tracks.forEach((name, index) => {
    const tile = soundTiles.get(name);
    const level = mix[index];
    if (level > 0) tile.lastLevel = level;
    const label = level > 0 ? level + '%' : 'Off';
    tile.levelText.textContent = label;
    tile.button.style.setProperty('--level', level + '%');
    tile.button.setAttribute('aria-pressed', String(level > 0));
    tile.input.setAttribute('aria-valuetext', label);
  });
  $('boostValue').value = $('boost').value + '%';
  $('boostNote').textContent = master.limited ? 'Boost limited to prevent clipping.' : '';
  try { localStorage.setItem(MIX_STORAGE_KEY, JSON.stringify(savedMix(mix))); } catch {}
  document.querySelectorAll('[data-mix]').forEach(button => {
    const selected = button.dataset.mix === mix.join(',');
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  refreshSavedMixes?.();
  return master.volumes;
}

function isGapless() {
  return modeControl.value === 'gapless';
}

function isPlaying() {
  return isGapless() ? gapless.playing : !player.paused;
}

function updatePlayback() {
  const playing = isPlaying();
  $('playText').textContent = starting ? 'Loading…' : playing ? 'Pause' : 'Play';
  $('playIcon').textContent = playing ? 'Ⅱ' : '▶';
  $('playIcon').hidden = starting;
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  if (isGapless() && gapless.active && !starting) {
    $('status').textContent = playing ? '' : 'Audio stopped. Tap Play.';
  }
  updateCountdown();
  if (playing && timerSettings.minutes && !countdown) {
    countdown = setInterval(updateCountdown, 500);
  } else if ((!playing || !timerSettings.minutes) && countdown) {
    clearInterval(countdown);
    countdown = undefined;
  }
}

function setStarting(value) {
  starting = value;
  $('play').disabled = value;
  if (value) {
    $('playText').textContent = 'Loading…';
    $('playIcon').hidden = true;
  }
  for (const name of [...tracks, 'boost']) $(name).disabled = value;
  for (const {button} of soundTiles.values()) button.disabled = value;
  document.querySelectorAll('[data-mix]').forEach(button => button.disabled = value);
  $('timerMinutes').disabled = value;
  $('timerFade').disabled = value || timerSettings.minutes === 0;
  $('savedMixes').disabled = value;
}

function pause() {
  revision++;
  setStarting(false);
  player.pause();
  void gapless?.pause().catch(() => {});
  updatePlayback();
  $('status').textContent = '';
}

function remainingScreenOffTime() {
  return screenOffSeconds == null ? null : Math.max(0, screenOffSeconds - player.currentTime);
}

function finishTimer() {
  pause();
  $('status').textContent = 'Timer finished.';
}

function updateCountdown() {
  const remaining = isGapless() ? gapless.timer?.remaining : remainingScreenOffTime();
  const hint = $('timerStatus');
  if (!timerSettings.minutes || remaining == null) hint.textContent = '';
  else if (remaining <= 0) {
    hint.textContent = '';
    if (isGapless() && isPlaying()) finishTimer();
  } else {
    hint.textContent = isPlaying() ? formatRemaining(remaining) + ' left' : 'Paused · ' + formatRemaining(remaining);
  }
}

function setGaplessTimer(restart = false, seconds = timerSettings.minutes * 60) {
  const timer = gapless?.timer;
  if (timer && (restart || timer.remaining == null || timer.remaining <= 0)) {
    timer.schedule(seconds, timerSettings.fadeSeconds, finishTimer);
  }
}

function showTimerSettings() {
  $('timerMinutes').value = timerSettings.minutes;
  $('timerFade').value = timerSettings.fadeSeconds;
  $('timerFadeControl').hidden = timerSettings.minutes === 0;
  $('timerFade').disabled = starting || timerSettings.minutes === 0;
}

function changeTimer() {
  const previous = timerSettings;
  timerSettings = restoreTimerSettings({
    minutes: Number($('timerMinutes').value),
    fadeSeconds: Number($('timerFade').value),
  });
  try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerSettings)); } catch {}
  const durationChanged = timerSettings.minutes !== previous.minutes;
  showTimerSettings();
  if (isGapless()) {
    const remaining = gapless?.timer?.remaining;
    const seconds = !durationChanged && remaining > 0 ? remaining : timerSettings.minutes * 60;
    setGaplessTimer(true, isPlaying() ? seconds : 0);
  } else {
    if (durationChanged) screenOffSeconds = null;
    restartScreenOffMix();
  }
  updatePlayback();
}

async function prepareMix(request) {
  for (;;) {
    const levels = values(), boost = $('boost').value;
    const {minutes, fadeSeconds} = timerSettings;
    const key = [...levels, boost, minutes, fadeSeconds].join(',');
    if (key === mixKey && !player.ended) return;
    const {volumes} = calculateMasterMix(levels, boost);
    const layers = await loadMixLayers(volumes);
    if (request !== revision) return;
    if (key !== [...values(), $('boost').value, timerSettings.minutes, timerSettings.fadeSeconds].join(',')) continue;
    const remaining = remainingScreenOffTime();
    const seconds = minutes ? (remaining > 0 && !player.ended ? remaining : minutes * 60) : null;
    const previous = currentURL;
    currentURL = URL.createObjectURL(makeNativeMix(layers, volumes, seconds == null ? null : {seconds, fadeSeconds}));
    screenOffSeconds = seconds;
    player.loop = seconds == null;
    player.src = currentURL;
    player.load();
    mixKey = key;
    if (previous) URL.revokeObjectURL(previous);
    return;
  }
}

async function play() {
  if (starting || isPlaying()) return;
  const {volumes} = calculateMasterMix(values(), $('boost').value);
  if (!volumes.some(volume => volume > 0)) {
    $('status').textContent = 'Turn on a sound.';
    return;
  }
  const request = ++revision;
  const useGapless = isGapless();
  setStarting(true);
  $('status').textContent = '';
  try {
    if (useGapless) {
      await gapless.play(volumes);
      if (request === revision) setGaplessTimer();
    } else {
      await prepareMix(request);
      if (request !== revision) return;
      await player.play();
    }
  } catch {
    if (request !== revision) return;
    player.pause();
    void gapless?.pause().catch(() => {});
    $('status').textContent = useGapless
      ? 'Couldn’t play. Try Screen-off in Settings.'
      : 'Couldn’t play. Check your connection.';
  } finally {
    if (request === revision) {
      setStarting(false);
      updatePlayback();
    }
  }
}

function changeLevels() {
  const volumes = applyMix();
  if (volumes.some(volume => volume > 0) && $('status').textContent === 'Turn on a sound.') {
    $('status').textContent = '';
  }
  if (isGapless() && gapless.active) {
    void gapless.setMix(volumes).catch(() => {
      if (isGapless() && gapless.active) $('status').textContent = 'Couldn’t change the mix. Try again.';
    });
  }
}

function restartScreenOffMix() {
  if (!isGapless() && !player.paused) {
    player.pause();
    void play();
  }
}

for (const name of [...tracks, 'boost']) {
  $(name).addEventListener('input', changeLevels);
  $(name).addEventListener('change', restartScreenOffMix);
}
document.querySelectorAll('[data-mix]').forEach(button => {
  button.onclick = () => {
    button.dataset.mix.split(',').forEach((value, index) => $(tracks[index]).value = value);
    changeLevels();
    restartScreenOffMix();
  };
});

function showMode() {
  $('modeNote').textContent = isGapless()
    ? 'If audio stops when you lock your phone, try Screen-off.'
    : 'Changing the mix or timer restarts audio.';
}
modeControl.onchange = () => {
  pause();
  gapless?.timer?.schedule(0, 0);
  screenOffSeconds = null;
  mixKey = '';
  try { localStorage.setItem('forestPlaybackMode', modeControl.value); } catch {}
  showMode();
  updateCountdown();
};
showMode();
applyMix();

for (const minutes of TIMER_MINUTES) {
  $('timerMinutes').add(new Option(minutes ? minutes + ' min' : 'Off', minutes));
}
for (const seconds of FADE_SECONDS) {
  $('timerFade').add(new Option(seconds ? seconds + ' sec' : 'None', seconds));
}
showTimerSettings();
updateCountdown();
$('timerMinutes').onchange = changeTimer;
$('timerFade').onchange = changeTimer;
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updatePlayback();
});

refreshSavedMixes = mountSavedMixes({
  current: () => ({levels: values(), boost: Number($('boost').value)}),
  recall: mix => {
    tracks.forEach((name, index) => $(name).value = mix.levels[index]);
    $('boost').value = mix.boost;
    changeLevels();
    restartScreenOffMix();
  },
});

$('play').onclick = () => isPlaying() ? pause() : play();
player.addEventListener('play', updatePlayback);
player.addEventListener('pause', updatePlayback);
player.addEventListener('ended', () => {
  if (!isGapless() && screenOffSeconds != null) {
    screenOffSeconds = 0;
    mixKey = '';
    finishTimer();
  }
});
player.addEventListener('error', () => {
  if (isGapless()) return;
  updatePlayback();
  $('status').textContent = 'Audio stopped. Tap Play.';
});
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'Your soundscape', artist: 'Sleep Sounds', album: 'Sleep Sounds',
    artwork: [{src: 'icon-512.png', sizes: '512x512', type: 'image/png'}],
  });
  for (const [action, handler] of [['play', play], ['pause', pause], ['stop', pause]]) {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
  }
}
if ('audioSession' in navigator) {
  try { navigator.audioSession.type = 'playback'; } catch {}
}

function markInstalled() {
  $('install').textContent = 'Installed';
  $('install').disabled = true;
  $('installStatus').textContent = '';
  installPrompt = null;
}
if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) markInstalled();
window.addEventListener('appinstalled', markInstalled);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
$('install').onclick = async () => {
  if (!installPrompt) {
    $('installStatus').textContent = 'Choose Add to Home Screen in your browser menu.';
    return;
  }
  const prompt = installPrompt;
  installPrompt = null;
  try {
    await prompt.prompt();
  } catch {
    $('installStatus').textContent = 'Choose Add to Home Screen in your browser menu.';
  }
};

async function readyStatus() {
  const cache = await caches.open(CACHE);
  const found = await Promise.all(FILES.map(file => cache.match(file)));
  if (!found.every(Boolean)) return false;
  $('offline').textContent = 'Saved offline';
  $('offline').disabled = true;
  $('offlineStatus').textContent = '';
  return true;
}

let swReady;
function offlineUnavailable() {
  $('offline').disabled = true;
  $('offlineStatus').textContent = 'Offline saving is unavailable.';
}
if ('serviceWorker' in navigator) {
  swReady = navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).then(() => navigator.serviceWorker.ready);
  swReady.then(readyStatus).catch(offlineUnavailable);
  navigator.serviceWorker.addEventListener('controllerchange', () => { void readyStatus().catch(() => {}); });
} else {
  offlineUnavailable();
}

$('offline').onclick = async () => {
  const button = $('offline');
  button.disabled = true;
  button.textContent = 'Saving…';
  $('offlineStatus').textContent = 'Keep this page open.';
  try {
    if (!swReady) throw Error();
    await swReady;
    const cache = await caches.open(CACHE);
    for (const [index, file] of FILES.entries()) {
      if (!await cache.match(file)) {
        const response = await fetch(file, {cache: 'reload'});
        if (!response.ok || response.status !== 200) throw Error();
        await cache.put(file, response);
      }
      $('offlineStatus').textContent = `${index + 1} / ${FILES.length} files`;
    }
    if (!await readyStatus()) throw Error();
  } catch {
    $('offlineStatus').textContent = 'Couldn’t save. Check your connection and storage.';
    button.textContent = 'Save offline';
    button.disabled = false;
  }
};
