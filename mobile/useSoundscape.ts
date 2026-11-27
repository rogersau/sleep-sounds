import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AudioContext, AudioManager, PlaybackNotificationManager } from 'react-native-audio-api';

import { DEFAULT_LEVELS } from '../dist/sound-library.js';
import type { TimerSettings } from '../dist/session-settings.js';
import { LoopMixer } from './loopMixer';
import { masterMix, type Levels } from './mix';
import { appendPlaybackLog, readTimerSettings, saveTimerSettings } from './preferences';
import { loadActiveLayers, sampleRate } from './tracks';

type Mix = { levels: Levels; boost: number };
type Session = {
  context?: AudioContext;
  mixer?: LoopMixer;
  mix: Mix;
  timerSettings: TimerSettings;
  pending: Promise<void>;
  command: number;
  wantsPlayback: boolean;
  resumeAfterInterruption: boolean;
  pausedByRouteAt: number | null;
  mounted: boolean;
};

const metadata = { title: 'Your soundscape', artist: 'Sleep Sounds' };
const ROUTE_RECONNECT_WINDOW_MS = 15_000;

async function closeAudio(session: Session) {
  const context = session.context;
  session.mixer?.timer.cancelSignal();
  session.context = undefined;
  session.mixer = undefined;
  if (context) {
    context.onstatechange = null;
    await context.close().catch(() => {});
  }
  AudioManager.observeAudioInterruptions(false);
  await Promise.allSettled([
    PlaybackNotificationManager.hide(),
    AudioManager.setAudioSessionActivity(false),
  ]);
}

export function useSoundscape() {
  const [timerSettings, setTimerSettings] = useState(readTimerSettings);
  const session = useRef<Session>({
    mix: { levels: DEFAULT_LEVELS, boost: 100 },
    timerSettings,
    pending: Promise.resolve(),
    command: 0,
    wantsPlayback: false,
    resumeAfterInterruption: false,
    pausedByRouteAt: null,
    mounted: false,
  }).current;
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerFinished, setTimerFinished] = useState(false);

  const finishTimer = useCallback((pause: () => void) => {
    if (!session.mounted || !session.wantsPlayback) return;
    appendPlaybackLog('timer_finished');
    setTimerRemaining(0);
    setTimerFinished(true);
    pause();
  }, [session]);

  const requestPlayback = useCallback(function request(play: boolean, reason = 'user', interrupted = false) {
    if (!interrupted) {
      session.resumeAfterInterruption = false;
      session.pausedByRouteAt = null;
    }
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

    session.pending = session.pending.then(async () => {
      if (!current()) return;
      if (!play) {
        if (session.context?.state === 'running') await session.context.suspend();
        if (current()) setPlaying(false);
        if (session.context) await PlaybackNotificationManager.show({ state: 'paused' });
        if (!interrupted) {
          AudioManager.observeAudioInterruptions(false);
          await AudioManager.setAudioSessionActivity(false);
        }
        return;
      }

      const { levels, boost } = session.mix;
      const { volumes } = masterMix(levels, boost);
      const buffers = await loadActiveLayers(volumes);
      if (!current()) return;

      const firstStart = !session.context;
      const context = session.context ??= new AudioContext({ sampleRate, latencyHint: 'playback' });
      await PlaybackNotificationManager.show({ ...metadata, state: 'playing' });
      if (firstStart) {
        await PlaybackNotificationManager.enableControl('play', true);
        await PlaybackNotificationManager.enableControl('pause', true);
      }
      AudioManager.observeAudioInterruptions(true);
      await AudioManager.setAudioSessionActivity(true);
      if (!current()) return;

      context.onstatechange = () => {
        appendPlaybackLog('context_state', context.state);
        if (session.mounted) setPlaying(context.state === 'running');
      };
      await context.resume();
      if (!current()) return;
      session.mixer ??= new LoopMixer(context);
      session.mixer.setMix(volumes, buffers);
      const timer = session.mixer.timer;
      const { minutes, fadeSeconds } = session.timerSettings;
      if (minutes && (timer.remaining ?? 0) <= 0) {
        timer.schedule(minutes * 60, fadeSeconds, () => finishTimer(() => request(false, 'timer')));
      }
      setTimerRemaining(timer.remaining);
      if (current()) setPlaying(true);
    }).catch(async err => {
      appendPlaybackLog('error', err instanceof Error ? err.message : String(err));
      await closeAudio(session);
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
    appendPlaybackLog('app_started');
    AudioManager.setSystemOptions({ ios: { category: 'playback', mode: 'default' } });
    const appStateSub = AppState.addEventListener('change', nextState => {
      appendPlaybackLog('app_state', nextState);
    });
    const subscriptions = [
      PlaybackNotificationManager.addEventListener('playbackNotificationPlay', () => requestPlayback(true, 'notification')),
      PlaybackNotificationManager.addEventListener('playbackNotificationPause', () => requestPlayback(false, 'notification')),
      AudioManager.addSystemEventListener('routeChange', ({ reason }) => {
        appendPlaybackLog('route_change', `${reason} (playing=${session.wantsPlayback})`);
        if (reason === 'OldDeviceUnavailable' && session.wantsPlayback) {
          session.pausedByRouteAt = Date.now();
          requestPlayback(false, 'route_unavailable', true);
        } else if (
          reason === 'NewDeviceAvailable'
          && session.pausedByRouteAt != null
          && Date.now() - session.pausedByRouteAt <= ROUTE_RECONNECT_WINDOW_MS
        ) {
          session.pausedByRouteAt = null;
          requestPlayback(true, 'route_reconnected');
        }
      }),
      AudioManager.addSystemEventListener('interruption', ({ type, shouldResume }) => {
        appendPlaybackLog('interruption', `${type} (shouldResume=${String(shouldResume)})`);
        if (type === 'began' && session.wantsPlayback) {
          session.resumeAfterInterruption = true;
          requestPlayback(false, 'interruption', true);
        } else if (type === 'ended' && session.resumeAfterInterruption) {
          session.resumeAfterInterruption = false;
          if (shouldResume) requestPlayback(true, 'interruption_resume');
        }
      }),
    ];
    return () => {
      appStateSub.remove();
      for (const subscription of subscriptions) subscription?.remove();
      session.mounted = false;
      session.wantsPlayback = false;
      session.command++;
      session.pending = session.pending.then(() => closeAudio(session));
    };
  }, [requestPlayback, session]);

  useEffect(() => {
    if (!playing || !timerSettings.minutes) return;
    const tick = setInterval(() => {
      const remaining = session.mixer?.timer.remaining;
      if (remaining == null) return;
      setTimerRemaining(Math.ceil(remaining));
      if (remaining <= 0) finishTimer(() => requestPlayback(false, 'timer'));
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
    timer.schedule(seconds, settings.fadeSeconds, () => finishTimer(() => requestPlayback(false, 'timer')));
    setTimerRemaining(timer.remaining);
  }

  function toggle(levels: Levels, boost: number) {
    session.mix = { levels, boost };
    requestPlayback(!session.wantsPlayback, 'user');
  }

  function updateMix(levels: Levels, boost: number) {
    const mix = { levels, boost };
    session.mix = mix;
    const mixer = session.mixer;
    setError(null);
    if (!mixer || !session.wantsPlayback || session.context?.state !== 'running') return;
    const { volumes } = masterMix(levels, boost);
    void loadActiveLayers(volumes).then(buffers => {
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
