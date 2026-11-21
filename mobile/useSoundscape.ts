import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContext, AudioManager, PlaybackNotificationManager } from 'react-native-audio-api';

import { LoopMixer } from './loopMixer';
import { masterMix, type Levels } from './mix';
import { loadLayer, sampleRate } from './tracks';

type Mix = { levels: Levels; boost: number };
type Session = {
  context?: AudioContext;
  mixer?: LoopMixer;
  mix: Mix;
  pending: Promise<void>;
  command: number;
  wantsPlayback: boolean;
  resumeAfterInterruption: boolean;
  mounted: boolean;
};

const metadata = { title: 'Under the canopy', artist: 'Sleep Sounds' };

async function closeAudio(session: Session) {
  const context = session.context;
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
  const session = useRef<Session>({
    mix: { levels: [70, 0], boost: 100 },
    pending: Promise.resolve(),
    command: 0,
    wantsPlayback: false,
    resumeAfterInterruption: false,
    mounted: false,
  }).current;
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPlayback = useCallback((play: boolean, interrupted = false) => {
    if (!interrupted) session.resumeAfterInterruption = false;
    if (session.wantsPlayback === play) return;
    session.wantsPlayback = play;
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
      const [rain, pink] = await Promise.all([
        session.mixer ? undefined : loadLayer('rain'),
        volumes[1] !== 0 ? loadLayer('pink') : undefined,
      ]);
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
        if (session.mounted) setPlaying(context.state === 'running');
      };
      await context.resume();
      if (session.mixer) {
        session.mixer.setMix(volumes, pink);
      } else if (rain) {
        session.mixer = new LoopMixer(context, rain, volumes, pink);
      }
      if (current()) setPlaying(true);
    }).catch(async () => {
      await closeAudio(session);
      if (current()) {
        session.wantsPlayback = false;
        setPlaying(false);
        setError('Audio could not play. Tap play to try again.');
      }
    }).finally(() => {
      if (current()) setPreparing(false);
    });
  }, [session]);

  useEffect(() => {
    session.mounted = true;
    AudioManager.setSystemOptions({ ios: { category: 'playback', mode: 'default' } });
    const subscriptions = [
      PlaybackNotificationManager.addEventListener('playbackNotificationPlay', () => requestPlayback(true)),
      PlaybackNotificationManager.addEventListener('playbackNotificationPause', () => requestPlayback(false)),
      AudioManager.addSystemEventListener('routeChange', ({ reason }) => {
        if (reason === 'OldDeviceUnavailable') requestPlayback(false);
      }),
      AudioManager.addSystemEventListener('interruption', ({ type, shouldResume }) => {
        if (type === 'began' && session.wantsPlayback) {
          session.resumeAfterInterruption = true;
          requestPlayback(false, true);
        } else if (type === 'ended' && session.resumeAfterInterruption) {
          session.resumeAfterInterruption = false;
          if (shouldResume) requestPlayback(true);
        }
      }),
    ];
    return () => {
      for (const subscription of subscriptions) subscription?.remove();
      session.mounted = false;
      session.wantsPlayback = false;
      session.command++;
      session.pending = session.pending.then(() => closeAudio(session));
    };
  }, [requestPlayback, session]);

  function toggle(levels: Levels, boost: number) {
    session.mix = { levels, boost };
    requestPlayback(!session.wantsPlayback);
  }

  function updateMix(levels: Levels, boost: number) {
    const mix = { levels, boost };
    session.mix = mix;
    const mixer = session.mixer;
    if (!mixer || !session.wantsPlayback || session.context?.state !== 'running') return;

    setError(null);
    const { volumes } = masterMix(levels, boost);
    const pink = volumes[1] !== 0 ? loadLayer('pink') : Promise.resolve(undefined);
    void pink.then(buffer => {
      if (session.mixer === mixer && session.mix === mix && session.wantsPlayback) {
        mixer.setMix(volumes, buffer);
      }
    }).catch(() => {
      if (session.mounted && session.mix === mix) {
        setError('The mix could not change. Adjust a volume to try again.');
      }
    });
  }

  return { playing, preparing, error, toggle, updateMix };
}
