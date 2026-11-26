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
  'rain-pink': 'Rain + pink', cabin: 'Cabin', cafe: 'Café', train: 'Night train', 'rain-cafe': 'Rain + café',
};
let timerSettings = DEFAULT_TIMER;
let screenOffSeconds = null;
let countdown;
let refreshSavedMixes;

const PLAY_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.52.85l10.6-6.8a1 1 0 0 0 0-1.7L9.52 4.35A1 1 0 0 0 8 5.2z"/></svg>';
const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4.2" height="15" rx="1.4"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4"/></svg>';

const SOUND_SVGS = {
  rain: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 14.2A3.7 3.7 0 0 1 5.8 7a5.2 5.2 0 0 1 9.8-1.1A3.9 3.9 0 0 1 17 14.2"/><path d="M8.5 17l-1 3M12.5 17.2l-1 3.2M16.2 17l-1 3"/></svg>',
  ocean: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 9.5c2.5-2.8 5.5-2.8 8 0s5.5 2.8 11 0"/><path d="M2.5 15.5c2.5-2.8 5.5-2.8 8 0s5.5 2.8 11 0"/></svg>',
  fireplace: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2c2.8 3.4 6.2 6.5 6.2 10.8a6.2 6.2 0 1 1-12.4 0c0-2.6 1.4-4.7 2.8-6.2.3 1.7 1.2 2.4 1.7 2.2-.3-2.5.4-4.8 1.7-6.8z"/><path d="M12 13c1.5 1.4 2.4 2.6 2.4 4a2.4 2.4 0 1 1-4.8 0c0-1.4.9-2.6 2.4-4z"/></svg>',
  stream: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 7.5c3.2-2.2 6.8 2.2 10 0s5.2-1.4 8 0"/><path d="M3 12.5c3.2-2.2 6.8 2.2 10 0s5.2-1.4 8 0"/><path d="M4.5 17.5c3.2-2 6.8 2 10 0s4.5-1.2 6 0"/></svg>',
  airplane: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 4.5L4.5 19.5M12.5 11.5L5.5 7.5 7 6l8.2 2.8M12.5 11.5l4 7 1.5-1.5-2.8-8.2M6.8 17.2L3.8 16M6.8 17.2L8 20.2"/></svg>',
  train: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="3.8" width="13" height="13.2" rx="2.8"/><line x1="5.8" y1="10.5" x2="18.2" y2="10.5"/><circle cx="9" cy="13.8" r="1" fill="currentColor"/><circle cx="15" cy="13.8" r="1" fill="currentColor"/><path d="M8.2 17.2L6.4 20.5M15.8 17.2l1.8 3.3M7.2 19.3h9.6"/></svg>',
  'coffee-shop': '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 9h12v6.2a3.3 3.3 0 0 1-3.3 3.3H8.1a3.3 3.3 0 0 1-3.3-3.3V9z"/><path d="M16.8 10h1.4a2.4 2.4 0 0 1 0 4.8h-1.4"/><path d="M8.5 6.5c-.6-1.2.6-2 0-3.2M12.5 6.5c-.6-1.2.6-2 0-3.2M4 21h13.6"/></svg>',
  pink: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4.5 10.2v3.6M8.25 7.2v9.6M12 4.8v14.4M15.75 7.8v8.4M19.5 10v4"/></svg>',
  brown: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5.2 12.5v4M9.7 9.5v8M14.3 8v10M18.8 11v6"/></svg>',
  white: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"><path d="M3.6 9.8v4.4M6.4 6.2v11.6M9.2 10.5v3M12 5v14M14.8 8.5v7M17.6 6.5v11M20.4 9.8v4.4"/></svg>',
};

function setupSheets() {
  const bindings = [
    ['openTimer', 'timerSheet'],
    ['openSaved', 'savedSheet'],
    ['openSettings', 'settingsSheet'],
  ];
  for (const [triggerId, dialogId] of bindings) {
    const dialog = $(dialogId);
    $(triggerId).onclick = () => dialog.showModal();
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelectorAll('[data-close-sheet]').forEach(btn => {
      btn.onclick = () => dialog.close();
    });
  }
}

function renderSoundOptions() {
  const sounds = SOUND_GROUPS.flatMap(group => SOUNDS.filter(sound => sound.group === group));
  const groups = new Map(SOUND_GROUPS.map(group => [group, SOUNDS.filter(sound => sound.group === group).length]));
  for (const group of [null, ...SOUND_GROUPS]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${group ?? 'All'} ${group ? groups.get(group) : sounds.length}`;
    button.dataset.filter = group ?? 'all';
    button.setAttribute('aria-pressed', String(!group));
    button.onclick = () => {
      document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      soundTiles.forEach((tile, id) => {
        const sound = SOUNDS.find(item => item.id === id);
        tile.button.closest('.sound-tile').hidden = Boolean(group && sound.group !== group);
      });
    };
    $('soundFilters').append(button);
  }

  for (const {id, title} of sounds) {
    const fragment = $('soundControl').content.cloneNode(true);
    const tileEl = fragment.querySelector('.sound-tile');
    const button = fragment.querySelector('button');
    const input = fragment.querySelector('input');
    const levelText = fragment.querySelector('.sound-level');
    const preset = PRESETS.find(({mix}) => mix[id] > 0);
    const tile = {button, input, levelText, lastLevel: preset?.mix[id] ?? 60};
    tileEl.dataset.sound = id;
    fragment.querySelector('.sound-icon').innerHTML = SOUND_SVGS[id] ?? '';
    fragment.querySelector('.sound-name').textContent = title;
    input.id = id;
    input.setAttribute('aria-label', title + ' volume');
    bindSoundTile(tile);
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

function bindSoundTile(tile) {
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
      lastLevel: tile.lastLevel, bounds: button.getBoundingClientRect(), dragging: false,
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

setupSheets();
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

function summarizeActive(mix) {
  const active = SOUNDS.map((sound, index) => ({title: sound.title, level: mix[index]})).filter(item => item.level > 0);
  if (!active.length) return {subtitle: 'Night air, softly mixed.', dock: 'No sounds active', count: 0};
  if (active.length === 1) {
    const label = `${active[0].title} · ${active[0].level}%`;
    return {subtitle: label, dock: label, count: 1};
  }
  const names = active.slice(0, 2).map(item => item.title).join(', ');
  const extra = active.length > 2 ? ` +${active.length - 2}` : '';
  return {
    subtitle: `${names}${extra}`,
    dock: `${active.length} sounds · ${names}${extra}`,
    count: active.length,
  };
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
  const summary = summarizeActive(mix);
  $('mixSubtitle').textContent = summary.subtitle;
  $('dockTitle').textContent = summary.dock;
  $('clearMix').hidden = summary.count === 0;
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
  const label = starting ? 'Loading…' : playing ? 'Pause' : 'Play';
  $('playText').textContent = label;
  $('play').setAttribute('aria-label', label);
  $('playIcon').innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
  $('playIcon').hidden = starting;
  document.body.classList.toggle('is-playing', playing);
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  if (isGapless() && gapless.active && !starting) {
    $('status').textContent = playing ? 'Playing' : 'Audio stopped. Tap Play.';
  } else if (!starting && playing) {
    $('status').textContent = 'Playing';
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
    $('play').setAttribute('aria-label', 'Loading…');
    $('playIcon').hidden = true;
    $('status').textContent = 'Preparing audio…';
  }
  for (const name of [...tracks, 'boost']) $(name).disabled = value;
  for (const {button} of soundTiles.values()) button.disabled = value;
  document.querySelectorAll('[data-mix]').forEach(button => button.disabled = value);
  document.querySelectorAll('#timerMinuteChips button, #timerFadeChips button').forEach(btn => btn.disabled = value);
  $('clearMix').disabled = value;
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
  const badge = $('timerBadge');
  const pill = $('openTimer');
  if (!timerSettings.minutes) {
    hint.textContent = '';
    badge.textContent = 'Off';
    pill.classList.remove('is-active');
    return;
  }
  pill.classList.add('is-active');
  if (remaining == null) {
    hint.textContent = `${timerSettings.minutes} min timer ready`;
    badge.textContent = `${timerSettings.minutes}m`;
  } else if (remaining <= 0) {
    hint.textContent = '';
    badge.textContent = `${timerSettings.minutes}m`;
    if (isGapless() && isPlaying()) finishTimer();
  } else {
    const formatted = formatRemaining(remaining);
    hint.textContent = isPlaying() ? formatted + ' left' : 'Paused · ' + formatted;
    badge.textContent = formatted;
  }
}

function setGaplessTimer(restart = false, seconds = timerSettings.minutes * 60) {
  const timer = gapless?.timer;
  if (timer && (restart || timer.remaining == null || timer.remaining <= 0)) {
    timer.schedule(seconds, timerSettings.fadeSeconds, finishTimer);
  }
}

function showTimerSettings() {
  document.querySelectorAll('#timerMinuteChips button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.minutes) === timerSettings.minutes));
  });
  document.querySelectorAll('#timerFadeChips button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.fade) === timerSettings.fadeSeconds));
  });
  $('timerFadeControl').hidden = timerSettings.minutes === 0;
}

function applyTimerChange(partial) {
  const previous = timerSettings;
  timerSettings = restoreTimerSettings({...timerSettings, ...partial});
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
$('clearMix').onclick = () => {
  tracks.forEach(name => $(name).value = 0);
  changeLevels();
  if (isPlaying()) pause();
};

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
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.minutes = String(minutes);
  btn.textContent = minutes ? minutes + ' min' : 'Off';
  btn.onclick = () => applyTimerChange({minutes});
  $('timerMinuteChips').append(btn);
}
for (const seconds of FADE_SECONDS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.fade = String(seconds);
  btn.textContent = seconds ? seconds + ' sec' : 'None';
  btn.onclick = () => applyTimerChange({fadeSeconds: seconds});
  $('timerFadeChips').append(btn);
}
showTimerSettings();
updatePlayback();
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
    $('savedSheet').close();
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
