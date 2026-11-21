export type Levels = readonly [rain: number, pink: number];

export function masterMix(levels: Levels, boost: number) {
  const rain = Math.min(100, Math.max(0, levels[0])) / 100;
  const pink = Math.min(100, Math.max(0, levels[1])) / 100;
  const requested = Math.min(150, Math.max(100, boost));
  const sum = rain + pink;
  // Match the web player's peak allowance so both layers retain their balance.
  const gain = Math.min(requested / 150, sum ? 0.98 / (0.85 * sum) : 1);
  return {
    volumes: [rain * gain, pink * gain] as const,
    limited: gain * 150 < requested - 0.1,
  };
}
