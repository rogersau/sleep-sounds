/* One native media element owns audio focus. Build a long WAV locally from the
 * original layers; playback never depends on background JS or MSE refills.
 * Blob parts reuse the same short PCM block, rather than a giant JS array.
 */
const MIX_CYCLES = 15; // 32 minutes before the browser's native loop.
const sourceLayers = new Map();
function loadLayer(name) {
  if (!sourceLayers.has(name)) sourceLayers.set(name, (async () => {
    const response = await fetch(AUDIO_FILES[name]);
    if (!response.ok) throw Error('Audio download failed');
    const bytes = await response.arrayBuffer();
    const view = new DataView(bytes);
    let offset = 12, format, pcm;
    while (offset + 8 <= bytes.byteLength) {
      const tag = String.fromCharCode(...new Uint8Array(bytes, offset, 4));
      const size = view.getUint32(offset + 4, true);
      if (tag === 'fmt ') format = {codec:view.getUint16(offset+8,true),channels:view.getUint16(offset+10,true),rate:view.getUint32(offset+12,true),bits:view.getUint16(offset+22,true)};
      if (tag === 'data') pcm = new Int16Array(bytes.slice(offset+8,offset+8+size));
      offset += 8 + size + (size % 2);
    }
    if (!format || !pcm || format.codec !== 1 || format.bits !== 16 || format.channels !== 2 || format.rate !== 24000) throw Error('Unsupported audio format');
    return pcm;
  })().catch(error => { sourceLayers.delete(name); throw error; }));
  return sourceLayers.get(name);
}
function loadMixLayers(volumes) {
  return Promise.all([loadLayer('rain'), volumes[1] === 0 ? null : loadLayer('pink')]);
}
function clampSample(value) {
  return Math.max(-32768, Math.min(32767, Math.round(value)));
}
function makeNativeMix(layers, volumes) {
  if (volumes[1] !== 0 && layers[0].length !== layers[1]?.length) throw Error('Layer lengths differ');
  const pcm = new Int16Array(layers[0].length);
  if (volumes[1] === 0) {
    for (let i = 0; i < pcm.length; i++) pcm[i] = clampSample(layers[0][i] * volumes[0]);
  } else {
    for (let i = 0; i < pcm.length; i++) pcm[i] = clampSample(layers[0][i] * volumes[0] + layers[1][i] * volumes[1]);
  }
  const size = pcm.byteLength * MIX_CYCLES;
  const header = new ArrayBuffer(44), view = new DataView(header);
  function label(at,text) { for(let i=0;i<text.length;i++) view.setUint8(at+i,text.charCodeAt(i)); }
  label(0,'RIFF');view.setUint32(4,36+size,true);label(8,'WAVE');label(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,24000,true);view.setUint32(28,96000,true);view.setUint16(32,4,true);view.setUint16(34,16,true);label(36,'data');view.setUint32(40,size,true);
  const cycle = new Blob([pcm]);
  return new Blob([header,...Array(MIX_CYCLES).fill(cycle)],{type:'audio/wav'});
}
