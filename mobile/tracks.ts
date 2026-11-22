import { Asset } from 'expo-asset';
import { decodeAudioData, type AudioBuffer } from 'react-native-audio-api';

import { SOUNDS } from '../dist/sound-library.js';
import type { Levels } from './mix';

export const sampleRate = 24_000;
type Layer = (typeof SOUNDS)[number]['id'];
const assets: Record<Layer, number> = {
  rain: require('../dist/rain.wav'),
  pink: require('../dist/pink.wav'),
  ocean: require('../dist/ocean.wav'),
  fireplace: require('../dist/fireplace.wav'),
  stream: require('../dist/stream.wav'),
  brown: require('../dist/brown.wav'),
  white: require('../dist/white.wav'),
};
const buffers = new Map<Layer, Promise<AudioBuffer>>();

function loadLayer(layer: Layer) {
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

export function loadActiveLayers(volumes: Levels) {
  return Promise.all(SOUNDS.map(({id}, index) => volumes[index] > 0 ? loadLayer(id) : undefined));
}
