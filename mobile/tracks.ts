import { Asset } from 'expo-asset';
import { decodeAudioData, type AudioBuffer } from 'react-native-audio-api';

export const sampleRate = 24_000;
const assets = {
  rain: require('../dist/rain.wav'),
  pink: require('../dist/pink.wav'),
};
type Layer = keyof typeof assets;
const buffers = new Map<Layer, Promise<AudioBuffer>>();

export function loadLayer(layer: Layer) {
  const existing = buffers.get(layer);
  if (existing) return existing;

  const decoding = Asset.fromModule(assets[layer]).downloadAsync().then(({ localUri }) => {
    if (!localUri) throw new Error('Bundled audio file unavailable');
    return decodeAudioData(localUri, sampleRate);
  }).catch(error => {
    buffers.delete(layer);
    throw error;
  });
  buffers.set(layer, decoding);
  return decoding;
}
