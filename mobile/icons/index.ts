import type { ImageSourcePropType } from 'react-native';

export const soundIcons: Record<string, ImageSourcePropType> = {
  rain: require('./rain.png'),
  ocean: require('./ocean.png'),
  fireplace: require('./fireplace.png'),
  stream: require('./stream.png'),
  airplane: require('./airplane.png'),
  train: require('./train.png'),
  'coffee-shop': require('./coffee-shop.png'),
  pink: require('./pink.png'),
  brown: require('./brown.png'),
  white: require('./white.png'),
};

export const uiIcons = {
  play: require('./play.png'),
  pause: require('./pause.png'),
  timer: require('./timer.png'),
  saved: require('./saved.png'),
  settings: require('./settings.png'),
  close: require('./close.png'),
} as const;
