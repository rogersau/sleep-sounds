import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Platform, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { soundIcons } from './icons';
import { colors, defaultSoundAccent, soundAccents } from './theme';

type Props = {
  id: string;
  title: string;
  description: string;
  value: number;
  defaultValue: number;
  disabled: boolean;
  onChange: (value: number, commit: boolean) => void;
  onDragChange: (dragging: boolean) => void;
};

type Gesture = {
  startX: number;
  startY: number;
  tileLeft: number;
  tileWidth: number;
  mode: 'pending' | 'dragging' | 'scrolling';
  level: number;
};

const dragThreshold = 8;

export function SoundTile({ id, title, description, value, defaultValue, disabled, onChange, onDragChange }: Props) {
  const lastLevel = useRef(value || defaultValue);
  const gesture = useRef<Gesture | null>(null);
  const tileWidth = useRef(0);
  const [preview, setPreview] = useState<number | null>(null);
  const [pressed, setPressed] = useState(false);
  const level = preview ?? value;
  const active = level > 0;
  const label = active ? `${level}%` : 'Off';
  const palette = soundAccents[id] ?? defaultSoundAccent;
  const icon = soundIcons[id];

  useEffect(() => {
    if (value > 0) lastLevel.current = value;
  }, [value]);

  function commitLevel(next: number) {
    if (next > 0) lastLevel.current = next;
    if (next !== value) onChange(next, true);
  }

  function toggle() {
    commitLevel(active ? 0 : lastLevel.current);
  }

  function beginGesture({ nativeEvent }: GestureResponderEvent) {
    if (disabled) return false;
    setPressed(true);
    const { pageX, pageY, locationX } = nativeEvent;
    gesture.current = {
      startX: pageX,
      startY: pageY,
      tileLeft: pageX - locationX,
      tileWidth: tileWidth.current,
      mode: 'pending',
      level: value,
    };
    return false;
  }

  function moveGesture({ nativeEvent }: GestureResponderEvent) {
    const current = gesture.current;
    if (!current || disabled || current.mode === 'scrolling') return;

    if (current.mode === 'pending') {
      const dx = Math.abs(nativeEvent.pageX - current.startX);
      const dy = Math.abs(nativeEvent.pageY - current.startY);
      if (Math.max(dx, dy) < dragThreshold) return;
      if (dx <= dy || current.tileWidth <= 0) {
        current.mode = 'scrolling';
        return;
      }
      current.mode = 'dragging';
      onDragChange(true);
    }

    const fraction = (nativeEvent.pageX - current.tileLeft) / current.tileWidth;
    const next = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
    if (next === current.level) return;
    current.level = next;
    setPreview(next);
    onChange(next, false);
  }

  function finishGesture(release?: GestureResponderEvent) {
    if (release) moveGesture(release);
    const current = gesture.current;
    gesture.current = null;
    setPressed(false);
    if (current?.mode === 'dragging') {
      onDragChange(false);
      setPreview(null);
      commitLevel(current.level);
    } else if (release && !disabled && current?.mode === 'pending') {
      toggle();
    }
  }

  return (
    <View
      style={[
        styles.tile,
        active && { backgroundColor: colors.surfaceActive, borderColor: palette.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      pointerEvents="box-only"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min: 0, max: 100, now: level, text: label }}
      accessibilityActions={[
        { name: 'activate', label: active ? 'Turn off' : 'Turn on' },
        { name: 'increment', label: 'Increase volume' },
        { name: 'decrement', label: 'Decrease volume' },
      ]}
      onLayout={({ nativeEvent: { layout } }) => { tileWidth.current = layout.width; }}
      onAccessibilityAction={({ nativeEvent: { actionName } }) => {
        if (disabled) return;
        if (actionName === 'activate') toggle();
        if (actionName === 'increment') commitLevel(Math.min(100, level + 5));
        if (actionName === 'decrement') commitLevel(Math.max(0, level - 5));
      }}
      onStartShouldSetResponder={() => !disabled}
      onResponderGrant={beginGesture}
      onResponderMove={moveGesture}
      onResponderRelease={finishGesture}
      onResponderTerminationRequest={() => gesture.current?.mode !== 'dragging'}
      onResponderTerminate={() => finishGesture()}
      onResponderStart={({ nativeEvent }) => {
        if (nativeEvent.touches.length > 1) finishGesture();
      }}
    >
      <View style={styles.fillTrack} pointerEvents="none">
        {level > 0 && (
          <View style={[styles.fillWrap, { width: `${level}%` }]}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.02)', palette.fill]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fillGradient}
            />
            {level < 100 && <View style={[styles.fillEdge, { backgroundColor: palette.accent }]} />}
          </View>
        )}
      </View>
      <View style={styles.topRow}>
        {icon && (
          <Image
            source={icon}
            style={[styles.icon, { tintColor: active ? palette.accent : colors.dim }]}
            accessible={false}
          />
        )}
        <Text style={[styles.value, active && { color: palette.accent }]}>{label}</Text>
      </View>
      <Text style={[styles.title, active && styles.titleActive]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48.3%',
    minHeight: 104,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 20,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } as object : null),
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.55 },
  fillTrack: {
    ...StyleSheet.absoluteFill,
  },
  fillWrap: {
    height: '100%',
    flexDirection: 'row',
  },
  fillGradient: {
    flex: 1,
  },
  fillEdge: {
    width: 2,
    height: '100%',
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  icon: {
    width: 24,
    height: 24,
  },
  value: {
    color: colors.dim,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.textSoft,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  titleActive: {
    color: colors.text,
  },
});
