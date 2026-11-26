import { Asset } from 'expo-asset';

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
  airplane: require('../dist/airplane.wav'),
  train: require('../dist/train.wav'),
  'coffee-shop': require('../dist/coffee-shop.wav'),
};

const decodedByContext = new WeakMap<AudioContext, Map<Layer, Promise<AudioBuffer>>>();

function loadLayer(context: AudioContext, layer: Layer): Promise<AudioBuffer> {
  let cache = decodedByContext.get(context);
  if (!cache) {
    cache = new Map();
    decodedByContext.set(context, cache);
  }
  const existing = cache.get(layer);
  if (existing) return existing;

  const decoding = (async () => {
    const asset = Asset.fromModule(assets[layer]);
    const uri = asset.uri;
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Failed to fetch ${layer}`);
    const arrayBuffer = await response.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
  })().catch(error => {
    cache?.delete(layer);
    throw error;
  });

  cache.set(layer, decoding);
  return decoding;
}

export function loadActiveLayers(context: AudioContext, volumes: Levels): Promise<(AudioBuffer | undefined)[]> {
  return Promise.all(SOUNDS.map(({ id }, index) => (volumes[index] > 0 ? loadLayer(context, id) : undefined)));
}
