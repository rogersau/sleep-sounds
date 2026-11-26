import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { uiIcons } from './icons';
import { colors } from './theme';

type Props = {
  playing: boolean;
  preparing: boolean;
  mixTitle: string;
  statusText: string;
  isError: boolean;
  timerBadge: string;
  timerActive: boolean;
  onToggle: () => void;
  onOpenTimer: () => void;
};

export function MiniPlayer({
  playing,
  preparing,
  mixTitle,
  statusText,
  isError,
  timerBadge,
  timerActive,
  onToggle,
  onOpenTimer,
}: Props) {
  const playLabel = preparing ? 'Preparing audio' : playing ? 'Pause' : 'Play';
  return (
    <View style={styles.dock}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playLabel}
        accessibilityState={{ disabled: preparing, busy: preparing }}
        disabled={preparing}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.playBtn,
          playing && styles.playBtnActive,
          pressed && styles.pressed,
          preparing && styles.disabled,
        ]}
      >
        {preparing ? (
          <ActivityIndicator color={colors.accentInk} />
        ) : (
          <Image
            source={playing ? uiIcons.pause : uiIcons.play}
            style={styles.playIcon}
            accessible={false}
          />
        )}
      </Pressable>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{mixTitle}</Text>
        <Text style={[styles.status, isError && styles.error]} numberOfLines={1}>{statusText}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sleep timer, ${timerBadge}`}
        onPress={onOpenTimer}
        style={({ pressed }) => [
          styles.timerPill,
          timerActive && styles.timerPillActive,
          pressed && styles.pressed,
        ]}
      >
        <Image
          source={uiIcons.timer}
          style={[styles.timerIcon, { tintColor: timerActive ? colors.timerActiveText : colors.muted }]}
          accessible={false}
        />
        <Text style={[styles.timerText, timerActive && styles.timerTextActive]}>{timerBadge}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    minHeight: 72,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    backgroundColor: colors.surfaceElevated,
    boxShadow: '0 18px 40px -14px rgba(0, 0, 0, 0.85)',
  },
  playBtn: {
    width: 50,
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    boxShadow: '0 6px 20px -6px rgba(220, 231, 247, 0.4)',
  },
  playBtnActive: {
    boxShadow: '0 0 0 4px rgba(140, 196, 255, 0.16), 0 8px 24px -6px rgba(140, 196, 255, 0.45)',
  },
  playIcon: {
    width: 21,
    height: 21,
    tintColor: colors.accentInk,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.65 },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    color: colors.muted,
    fontSize: 12,
  },
  error: {
    color: colors.error,
  },
  timerPill: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerPillActive: {
    backgroundColor: colors.timerActiveBg,
    borderColor: colors.timerActiveBorder,
  },
  timerIcon: {
    width: 15,
    height: 15,
  },
  timerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timerTextActive: {
    color: colors.timerActiveText,
  },
});
