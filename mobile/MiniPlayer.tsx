import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

type Props = {
  playing: boolean;
  preparing: boolean;
  activeCount: number;
  timerLabel: string;
  onToggle: () => void;
};

export function MiniPlayer({ playing, preparing, activeCount, timerLabel, onToggle }: Props) {
  const soundLabel = activeCount ? `${activeCount} sound${activeCount === 1 ? '' : 's'} active` : 'No sounds active';
  const label = preparing ? 'Preparing audio' : playing ? 'Pause' : 'Start listening';
  return (
    <View style={styles.player}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: preparing, busy: preparing }}
        disabled={preparing}
        onPress={onToggle}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, preparing && styles.disabled]}
      >
        {preparing
          ? <ActivityIndicator color={colors.dark} />
          : <Text style={styles.symbol}>{playing ? 'Ⅱ' : '▶'}</Text>}
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>YOUR SOUNDSCAPE</Text>
        <Text style={styles.title}>{soundLabel}</Text>
        <Text style={styles.timer}>{timerLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    minHeight: 76, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, borderWidth: 1, borderColor: colors.hairline,
    backgroundColor: 'rgba(18, 33, 28, .97)',
    boxShadow: '0 12px 30px -12px rgba(0, 0, 0, .65)',
  },
  button: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  buttonPressed: { opacity: 0.78 },
  disabled: { opacity: 0.7 },
  symbol: { color: colors.dark, fontSize: 17 },
  copy: { flex: 1, gap: 1 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '600', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  timer: { color: colors.muted, fontSize: 12 },
});
