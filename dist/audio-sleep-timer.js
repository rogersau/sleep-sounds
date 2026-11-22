// Schedule the fade on the audio clock so silence does not depend on a JavaScript timer.
class AudioSleepTimer {
  constructor(context, output) {
    this.context = context;
    this.output = output;
    this.signal = null;
    this.envelope = null;
  }

  get remaining() {
    const end = this.envelope?.end;
    return end == null ? null : Math.max(0, end - this.context.currentTime);
  }

  levelAt(now) {
    const curve = this.envelope;
    if (!curve) return 1;
    const { start, from, restore, fadeAt, end } = curve;
    if (now < restore) return from + (1 - from) * (now - start) / (restore - start);
    if (end == null || now < fadeAt) return 1;
    if (now >= end) return 0;
    return (end - now) / (end - fadeAt);
  }

  /** @param {number} seconds @param {number} fadeSeconds @param {() => void} [onFinished] */
  schedule(seconds, fadeSeconds, onFinished) {
    const now = this.context.currentTime;
    const from = this.levelAt(now);
    this.cancelSignal();

    const end = seconds > 0 ? now + seconds : null;
    const restore = from === 1 ? now : Math.min(now + 0.05, end ?? Infinity);
    const fadeAt = end == null ? null : Math.max(restore, end - fadeSeconds);
    this.envelope = { start: now, from, restore, fadeAt, end };

    const gain = this.output.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(from, now);
    if (restore > now) gain.linearRampToValueAtTime(1, restore);
    if (end == null) return;

    if (fadeAt < end) {
      gain.setValueAtTime(1, fadeAt);
      gain.linearRampToValueAtTime(0, end);
    } else {
      gain.setValueAtTime(0, end);
    }

    const signal = this.context.createConstantSource();
    this.signal = signal;
    signal.offset.value = 0;
    signal.connect(this.output);
    signal.onended = () => {
      if (this.signal !== signal) return;
      signal.onended = null;
      signal.disconnect();
      this.signal = null;
      onFinished?.();
    };
    signal.start(now);
    signal.stop(end);
  }

  cancelSignal() {
    if (!this.signal) return;
    const signal = this.signal;
    this.signal = null;
    signal.onended = null;
    signal.stop(this.context.currentTime);
    signal.disconnect();
  }
}

if (typeof module !== 'undefined') module.exports = { AudioSleepTimer };
