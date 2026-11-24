/* One native media element owns audio focus. Build a long WAV locally from the
 * original layers; playback never depends on background JS or MSE refills.
 * Blob parts reuse the same short PCM block, rather than a giant JS array.
 */
const MIX_CYCLES = 15; // 32 minutes before the browser's native loop.
const SAMPLE_RATE = 24000;
const CYCLE_SAMPLES = 128 * SAMPLE_RATE * 2;
const sourceLayers = new Map();
function loadLayer(name) {
  if (!sourceLayers.has(name)) sourceLayers.set(name, (async () => {
    const sound = SOUNDS.find(item => item.id === name);
    if (!sound) throw Error('Unknown sound');
    const response = await fetch(AUDIO_FILES[name]);
    if (!response.ok) throw Error('Audio download failed');
    const bytes = await response.arrayBuffer();
    const view = new DataView(bytes);
    let offset = 12, format, pcm;
    while (offset + 8 <= bytes.byteLength) {
      const tag = String.fromCharCode(...new Uint8Array(bytes, offset, 4));
      const size = view.getUint32(offset + 4, true);
      if (offset + 8 + size > bytes.byteLength) throw Error('Audio file is truncated');
      if (tag === 'fmt ' && size >= 16) format = {codec:view.getUint16(offset+8,true),channels:view.getUint16(offset+10,true),rate:view.getUint32(offset+12,true),bits:view.getUint16(offset+22,true)};
      if (tag === 'data' && size % 4 === 0) pcm = new Int16Array(bytes, offset + 8, size / 2);
      offset += 8 + size + (size % 2);
    }
    if (!format || pcm?.length !== sound.seconds * SAMPLE_RATE * 2 || format.codec !== 1 ||
        format.bits !== 16 || format.channels !== 2 || format.rate !== SAMPLE_RATE) {
      throw Error('Unsupported audio format');
    }
    return pcm;
  })().catch(error => { sourceLayers.delete(name); throw error; }));
  return sourceLayers.get(name);
}
function loadMixLayers(volumes) {
  return Promise.all(SOUNDS.map(({id}, index) => volumes[index] > 0 ? loadLayer(id) : null));
}
function clampSample(value) {
  return Math.max(-32768, Math.min(32767, Math.round(value)));
}
function makeNativeMix(layers, volumes, timer = null) {
  const inputs = [];
  for (const [index, volume] of volumes.entries()) {
    if (volume === 0) continue;
    const layer = layers[index];
    if (!layer?.length || CYCLE_SAMPLES % layer.length !== 0) throw Error('Sound does not fit the mix cycle');
    inputs.push({layer, volume});
  }
  // Each source fits into the cycle a whole number of times and wraps cleanly.
  const pcm = new Int16Array(CYCLE_SAMPLES);
  for (let i = 0; i < pcm.length; i++) {
    let sum = 0;
    for (const {layer, volume} of inputs) sum += layer[i % layer.length] * volume;
    pcm[i] = clampSample(sum);
  }
  const framesPerCycle = pcm.length / 2;
  const frames = timer ? Math.max(1, Math.round(timer.seconds * SAMPLE_RATE)) : framesPerCycle * MIX_CYCLES;
  const size = frames * 4;
  const header = new ArrayBuffer(44), view = new DataView(header);
  function label(at,text) { for(let i=0;i<text.length;i++) view.setUint8(at+i,text.charCodeAt(i)); }
  label(0,'RIFF');view.setUint32(4,36+size,true);label(8,'WAVE');label(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,24000,true);view.setUint32(28,96000,true);view.setUint16(32,4,true);view.setUint16(34,16,true);label(36,'data');view.setUint32(40,size,true);
  const cycle = new Blob([pcm]);
  const requestedFade = timer ? Math.round(timer.fadeSeconds * SAMPLE_RATE) : 0;
  const fadeFrames = Math.min(frames, requestedFade);
  const steadyFrames = frames - fadeFrames;
  const parts = [header, ...Array(Math.floor(steadyFrames / framesPerCycle)).fill(cycle)];
  const remainder = steadyFrames % framesPerCycle;
  if (remainder) parts.push(cycle.slice(0, remainder * 4));
  if (fadeFrames) {
    // Encode the fade and the end of the track so the media player can finish while the page is asleep.
    const tail = new Int16Array(fadeFrames * 2);
    for (let frame = 0; frame < fadeFrames; frame++) {
      const source = ((steadyFrames + frame) % framesPerCycle) * 2;
      const scale = (fadeFrames - frame - 1) / Math.max(1, requestedFade - 1);
      tail[frame * 2] = clampSample(pcm[source] * scale);
      tail[frame * 2 + 1] = clampSample(pcm[source + 1] * scale);
    }
    parts.push(tail);
  }
  return new Blob(parts, {type: 'audio/wav'});
}
