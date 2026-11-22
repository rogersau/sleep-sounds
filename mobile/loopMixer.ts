import type { AudioBuffer, AudioContext, GainNode } from 'react-native-audio-api';

import { AudioSleepTimer } from '../dist/audio-sleep-timer.js';
import type { Levels } from './mix';

const fadeSeconds = 0.06;
const schedulingLeadFrames = 2048;

export class LoopMixer {
  readonly timer: AudioSleepTimer;
  private readonly context: AudioContext;
  private readonly output: GainNode;
  private readonly firstFrame: number;
  private readonly gains = new Map<number, GainNode>();

  constructor(context: AudioContext) {
    this.context = context;
    this.output = context.createGain();
    this.output.connect(context.destination);
    this.timer = new AudioSleepTimer(context, this.output);
    this.firstFrame = this.nextStartFrame();
  }

  setMix(volumes: Levels, buffers: readonly (AudioBuffer | undefined)[]) {
    let frame = Math.max(this.firstFrame, Math.round(this.context.currentTime * this.context.sampleRate));
    if (buffers.some((buffer, index) => buffer && !this.gains.has(index))) {
      frame = Math.max(this.firstFrame, this.nextStartFrame());
    }

    const when = frame / this.context.sampleRate;
    volumes.forEach((volume, index) => {
      const buffer = buffers[index];
      let node = this.gains.get(index);
      if (!node && buffer) {
        const phase = (frame - this.firstFrame) % buffer.length;
        node = this.startLoop(buffer, frame, phase);
        this.gains.set(index, node);
      }
      node?.gain.cancelAndHoldAtTime(when).linearRampToValueAtTime(volume, when + fadeSeconds);
    });
  }

  private nextStartFrame() {
    return Math.round(this.context.currentTime * this.context.sampleRate) + schedulingLeadFrames;
  }

  private startLoop(buffer: AudioBuffer, frame: number, offset: number) {
    const gain = this.context.createGain();
    gain.gain.value = 0;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    // The setter also enables wrapping in the native buffer processor.
    source.loop = true;
    source.loopEnd = buffer.duration;
    source.connect(gain);
    gain.connect(this.output);
    source.start(frame / this.context.sampleRate, offset / this.context.sampleRate);
    return gain;
  }
}
