import type { AudioBuffer, AudioContext, GainNode } from 'react-native-audio-api';

import type { Levels } from './mix';

const fadeSeconds = 0.06;
const schedulingLeadFrames = 2048;

export class LoopMixer {
  private readonly context: AudioContext;
  private readonly firstFrame: number;
  private readonly loopFrames: number;
  private readonly rainGain: GainNode;
  private pinkGain?: GainNode;

  constructor(context: AudioContext, rain: AudioBuffer, volumes: Levels, pink?: AudioBuffer) {
    this.context = context;
    this.loopFrames = rain.length;
    this.firstFrame = this.nextStartFrame();
    this.rainGain = this.startLoop(rain, this.firstFrame, 0);
    this.setMix(volumes, pink);
  }

  setMix(volumes: Levels, pink?: AudioBuffer) {
    let frame = Math.max(this.firstFrame, Math.round(this.context.currentTime * this.context.sampleRate));
    if (volumes[1] !== 0 && !this.pinkGain && pink) {
      if (pink.length !== this.loopFrames) throw new Error('Layer lengths differ');
      // When pink noise first joins, start on the frame rain will be playing at that time.
      frame = Math.max(this.firstFrame, this.nextStartFrame());
      this.pinkGain = this.startLoop(pink, frame, (frame - this.firstFrame) % this.loopFrames);
    }

    const when = frame / this.context.sampleRate;
    const rain = this.rainGain.gain;
    rain.cancelAndHoldAtTime(when).linearRampToValueAtTime(volumes[0], when + fadeSeconds);
    if (this.pinkGain) {
      this.pinkGain.gain.cancelAndHoldAtTime(when).linearRampToValueAtTime(volumes[1], when + fadeSeconds);
    }
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
    gain.connect(this.context.destination);
    source.start(frame / this.context.sampleRate, offset / this.context.sampleRate);
    return gain;
  }
}
