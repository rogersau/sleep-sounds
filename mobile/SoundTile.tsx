import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { colors } from './theme';

type Props = {
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
  meterLeft: number;
  meterWidth: number;
  mode: 'pending' | 'dragging' | 'scrolling';
  level: number;
};

const dragThreshold = 8;

export function SoundTile({ title, description, value, defaultValue, disabled, onChange, onDragChange }: Props) {
  const lastLevel = useRef(value || defaultValue);
  const gesture = useRef<Gesture | null>(null);
  const meter = useRef({ x: 0, width: 0 });
  const [preview, setPreview] = useState<number | null>(null);
  const [pressed, setPressed] = useState(false);
  const level = preview ?? value;
  const active = level > 0;
  const label = active ? `${level}%` : 'Off';

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
      meterLeft: pageX - locationX + meter.current.x,
      meterWidth: meter.current.width,
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
      if (dx <= dy || current.meterWidth <= 0) {
        current.mode = 'scrolling';
        return;
      }
      current.mode = 'dragging';
      onDragChange(true);
    }

    const fraction = (nativeEvent.pageX - current.meterLeft) / current.meterWidth;
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
      style={[styles.tile, active && styles.active, pressed && styles.pressed, disabled && styles.disabled]}
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
      <View style={styles.label}>
        <Text style={[styles.title, active && styles.accent]}>{title}</Text>
        <Text style={[styles.value, active && styles.accent]}>{label}</Text>
      </View>
      <View style={styles.meter} onLayout={({ nativeEvent: { layout } }) => { meter.current = layout; }}>
        <LinearGradient
          colors={['#b9cbaa', '#e7f0db']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${level}%` }]}
        />
        <View style={[styles.thumb, active ? styles.thumbActive : styles.thumbInactive, { left: `${level}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '48%', minHeight: 64, paddingHorizontal: 11, paddingVertical: 12, gap: 12,
    justifyContent: 'space-between', borderWidth: 1, borderRadius: 16,
    borderColor: colors.border, backgroundColor: colors.control,
  },
  active: { borderColor: colors.selectedBorder, backgroundColor: colors.selected },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.7 },
  label: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 5 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  value: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  accent: { color: colors.accent },
  meter: { height: 5, marginHorizontal: 5, borderRadius: 999, backgroundColor: colors.background },
  fill: { height: '100%', borderRadius: 999 },
  thumb: {
    position: 'absolute', top: -3, width: 11, height: 11, borderRadius: 999,
    transform: [{ translateX: -5.5 }], backgroundColor: colors.text,
  },
  thumbActive: { boxShadow: '0 0 8px rgba(207, 224, 194, .5)' },
  thumbInactive: { opacity: 0.3, backgroundColor: colors.muted },
});
