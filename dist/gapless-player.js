class GaplessPlayer {
  constructor(AudioContext, onStateChange) {
    this.AudioContext = AudioContext;
    this.onStateChange = onStateChange;
    this.buffers = new Map();
    this.gains = new Map();
    this.active = false;
    this.revision = 0;
  }

  get playing() {
    return this.active && this.context?.state === 'running' && this.gains.size > 0;
  }

  async play(volumes) {
    if (!this.context) {
      this.context = new this.AudioContext({ latencyHint: 'playback' });
      this.context.onstatechange = this.onStateChange;
      this.output = this.context.createGain();
      this.output.connect(this.context.destination);
      this.timer = new AudioSleepTimer(this.context, this.output);
    }
    this.active = true;
    const revision = ++this.revision;
    await this.context.resume();
    if (revision === this.revision) await this.setMix(volumes);
  }

  async pause() {
    this.active = false;
    this.revision++;
    if (this.context) await this.context.suspend();
  }

  getBuffer(name) {
    if (!this.buffers.has(name)) {
      const pending = loadLayer(name).then(pcm => {
        // Preserve the recording's original PCM rate and channel order.
        const buffer = this.context.createBuffer(2, pcm.length / 2, SAMPLE_RATE);
        for (let channel = 0; channel < 2; channel++) {
          const samples = buffer.getChannelData(channel);
          for (let frame = 0; frame < samples.length; frame++) {
            samples[frame] = pcm[frame * 2 + channel] / 32768;
          }
        }
        return buffer;
      }).catch(error => {
        this.buffers.delete(name);
        throw error;
      });
      this.buffers.set(name, pending);
    }
    return this.buffers.get(name);
  }

  async setMix(volumes) {
    if (!this.active) return;
    const revision = ++this.revision;
    const pending = Promise.all(SOUNDS.map(({id}, index) =>
      volumes[index] > 0 && !this.gains.has(id) ? this.getBuffer(id) : null
    ));
    const buffers = await pending.catch(error => {
      if (revision === this.revision) throw error;
      return [];
    });
    if (revision !== this.revision) return;
    const now = this.context.currentTime;
    const when = Math.max(this.startedAt ?? 0, buffers.some(Boolean) ? now + 0.05 : now);
    this.startedAt ??= when;
    SOUNDS.forEach(({id}, index) => {
      const buffer = buffers[index];
      if (buffer) {
        const phase = (when - this.startedAt) % buffer.duration;
        this.gains.set(id, this.startLoop(buffer, when, phase));
      }
      const gain = this.gains.get(id);
      if (gain) this.setGain(gain, volumes[index], when);
    });
  }

  startLoop(buffer, when, offset) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = 0;
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(this.output);
    source.start(when, offset);
    return gain;
  }

  setGain(node, volume, when) {
    node.gain.cancelScheduledValues(when);
    node.gain.setTargetAtTime(volume, when, 0.02);
  }
}
