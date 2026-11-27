import { useCallback, useEffect, useRef, useState } from 'react';

import { AudioSleepTimer } from '../dist/audio-sleep-timer.js';
import { DEFAULT_LEVELS } from '../dist/sound-library.js';
import type { TimerSettings } from '../dist/session-settings.js';
import { masterMix, type Levels } from './mix';
import { appendPlaybackLog, readTimerSettings, saveTimerSettings } from './preferences.web';
import { loadActiveLayers } from './tracks.web';

type Mix = { levels: Levels; boost: number };

class WebLoopMixer {
  readonly timer: AudioSleepTimer;
  private readonly context: AudioContext;
  private readonly output: GainNode;
  private readonly startedAt: number;
  private readonly gains = new Map<number, GainNode>();

  constructor(context: AudioContext) {
    this.context = context;
    this.output = context.createGain();
    this.output.connect(context.destination);
    this.timer = new AudioSleepTimer(context, this.output);
    this.startedAt = context.currentTime + 0.05;
  }

  setMix(volumes: Levels, buffers: readonly (AudioBuffer | undefined)[]) {
    const now = this.context.currentTime;
    const when = Math.max(this.startedAt, now + 0.04);
    volumes.forEach((volume, index) => {
      const buffer = buffers[index];
      let node = this.gains.get(index);
      if (!node && buffer) {
        node = this.context.createGain();
        node.gain.setValueAtTime(0, when);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(node);
        node.connect(this.output);
        const offset = Math.max(0, (when - this.startedAt) % buffer.duration);
        source.start(when, offset);
        this.gains.set(index, node);
      }
      if (node) {
        const current = node.gain.value;
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(current, now);
        node.gain.linearRampToValueAtTime(volume, now + 0.06);
      }
    });
  }
}

type Session = {
  context?: AudioContext;
  mixer?: WebLoopMixer;
  mix: Mix;
  timerSettings: TimerSettings;
  pending: Promise<void>;
  command: number;
  wantsPlayback: boolean;
  mounted: boolean;
};

function createAudioContext(): AudioContext {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctor();
}

export function useSoundscape() {
  const [timerSettings, setTimerSettings] = useState(readTimerSettings);
  const session = useRef<Session>({
    mix: { levels: DEFAULT_LEVELS, boost: 100 },
    timerSettings,
    pending: Promise.resolve(),
    command: 0,
    wantsPlayback: false,
    mounted: false,
  }).current;
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerFinished, setTimerFinished] = useState(false);

  const finishTimer = useCallback((pause: () => void) => {
    if (!session.mounted || !session.wantsPlayback) return;
    setTimerRemaining(0);
    setTimerFinished(true);
    pause();
  }, [session]);

  const requestPlayback = useCallback(function request(play: boolean, reason = 'user') {
    if (session.wantsPlayback === play) return;
    if (play && session.mix.levels.every(level => level === 0)) {
      setError('Turn up a sound to start listening.');
      return;
    }
    appendPlaybackLog(play ? 'play' : 'pause', reason);
    session.wantsPlayback = play;
    if (play) setTimerFinished(false);
    const command = ++session.command;
    const current = () => session.mounted && session.command === command;
    setPreparing(play);
    setError(null);

    // Create/resume AudioContext synchronously inside the user gesture on web
    if (play) {
      session.context ??= createAudioContext();
      if (session.context.state === 'suspended') {
        void session.context.resume().catch(() => {});
      }
    }

    session.pending = session.pending.then(async () => {
      if (!current()) return;
      if (!play) {
        if (session.context?.state === 'running') await session.context.suspend();
        if (current()) setPlaying(false);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        return;
      }

      const context = session.context ??= createAudioContext();
      const { levels, boost } = session.mix;
      const { volumes } = masterMix(levels, boost);
      const buffers = await loadActiveLayers(context, volumes);
      if (!current()) return;

      context.onstatechange = () => {
        if (session.mounted) setPlaying(context.state === 'running');
      };
      await context.resume();
      if (!current()) return;

      session.mixer ??= new WebLoopMixer(context);
      session.mixer.setMix(volumes, buffers);
      const timer = session.mixer.timer;
      const { minutes, fadeSeconds } = session.timerSettings;
      if (minutes && (timer.remaining ?? 0) <= 0) {
        timer.schedule(minutes * 60, fadeSeconds, () => finishTimer(() => request(false)));
      }
      setTimerRemaining(timer.remaining);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      if (current()) setPlaying(true);
    }).catch(async () => {
      const ctx = session.context;
      session.mixer?.timer.cancelSignal();
      session.context = undefined;
      session.mixer = undefined;
      if (ctx) await ctx.close().catch(() => {});
      if (current()) {
        session.wantsPlayback = false;
        setPlaying(false);
        setTimerRemaining(null);
        setError('Audio could not play. Tap play to try again.');
      }
    }).finally(() => {
      if (current()) setPreparing(false);
    });
  }, [finishTimer, session]);

  useEffect(() => {
    session.mounted = true;
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Your soundscape',
          artist: 'Sleep Sounds',
          album: 'Sleep Sounds',
        });
        navigator.mediaSession.setActionHandler('play', () => requestPlayback(true));
        navigator.mediaSession.setActionHandler('pause', () => requestPlayback(false));
        navigator.mediaSession.setActionHandler('stop', () => requestPlayback(false));
      } catch {
        // Ignore unsupported media session environments.
      }
    }
    return () => {
      session.mounted = false;
      session.wantsPlayback = false;
      session.command++;
      const ctx = session.context;
      session.mixer?.timer.cancelSignal();
      session.context = undefined;
      session.mixer = undefined;
      if (ctx) void ctx.close().catch(() => {});
    };
  }, [requestPlayback, session]);

  useEffect(() => {
    if (!playing || !timerSettings.minutes) return;
    const tick = setInterval(() => {
      const remaining = session.mixer?.timer.remaining;
      if (remaining == null) return;
      setTimerRemaining(Math.ceil(remaining));
      if (remaining <= 0) finishTimer(() => requestPlayback(false));
    }, 500);
    return () => clearInterval(tick);
  }, [playing, timerSettings.minutes, finishTimer, requestPlayback, session]);

  function updateTimer(settings: TimerSettings) {
    const sameDuration = settings.minutes === session.timerSettings.minutes;
    if (sameDuration && settings.fadeSeconds === session.timerSettings.fadeSeconds) return;
    session.timerSettings = settings;
    setTimerSettings(settings);
    saveTimerSettings(settings);
    setTimerFinished(false);

    const timer = session.mixer?.timer;
    if (!timer) return;
    const remaining = timer.remaining ?? 0;
    const seconds = settings.minutes && session.wantsPlayback && session.context?.state === 'running'
      ? (sameDuration && remaining > 0 ? remaining : settings.minutes * 60)
      : 0;
    timer.schedule(seconds, settings.fadeSeconds, () => finishTimer(() => requestPlayback(false)));
    setTimerRemaining(timer.remaining);
  }

  function toggle(levels: Levels, boost: number) {
    session.mix = { levels, boost };
    requestPlayback(!session.wantsPlayback);
  }

  function updateMix(levels: Levels, boost: number) {
    const mix = { levels, boost };
    session.mix = mix;
    const mixer = session.mixer;
    const context = session.context;
    setError(null);
    if (!mixer || !context || !session.wantsPlayback || context.state !== 'running') return;
    const { volumes } = masterMix(levels, boost);
    void loadActiveLayers(context, volumes).then(buffers => {
      if (session.mixer === mixer && session.mix === mix && session.wantsPlayback) {
        mixer.setMix(volumes, buffers);
      }
    }).catch(() => {
      if (session.mounted && session.mix === mix) {
        setError('The mix could not change. Adjust a volume to try again.');
      }
    });
  }

  return { playing, preparing, error, toggle, updateMix, timerSettings, timerRemaining, timerFinished, updateTimer };
}
