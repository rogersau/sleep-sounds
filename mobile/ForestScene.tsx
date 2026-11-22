import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

const pines = [
  { left: '-5%', size: 122, back: false },
  { left: '9%', size: 146, back: true },
  { left: '22%', size: 83, back: false },
  { left: '38%', size: 105, back: true },
  { left: '49%', size: 135, back: false },
  { left: '64%', size: 114, back: true },
  { left: '73%', size: 94, back: false },
  { left: '87%', size: 160, back: false },
] as const;

const stars = [
  { top: 14, left: '12%', size: 2, dim: false },
  { top: 36, left: '27%', size: 1.5, dim: true },
  { top: 12, left: '42%', size: 2.5, dim: false },
  { top: 48, left: '55%', size: 1.5, dim: true },
  { top: 22, left: '68%', size: 2, dim: false },
  { top: 40, left: '82%', size: 1.5, dim: true },
  { top: 64, left: '18%', size: 1.5, dim: true },
  { top: 10, left: '92%', size: 2, dim: false },
] as const;

export function ForestScene() {
  return (
    <LinearGradient colors={['#1a3a30', '#12211c', colors.background]} style={styles.scene}>
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {stars.map(({ top, left, size, dim }) => (
          <View key={left} style={[styles.star, { top, left, width: size, height: size, borderRadius: size / 2, opacity: dim ? 0.5 : 0.9 }]} />
        ))}
        <View style={styles.moon} />
        {pines.map(({ left, size, back }) => (
          <View
            key={left}
            style={[
              styles.pine,
              {
                left,
                bottom: back ? 20 : 0,
                borderLeftWidth: size / 3.8,
                borderRightWidth: size / 3.8,
                borderBottomWidth: size,
                borderBottomColor: back ? '#20372c' : '#12211c',
              },
            ]}
          />
        ))}
        <LinearGradient colors={[colors.background + '00', colors.background]} style={styles.shade} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>A little rain.</Text>
      <Text style={styles.subtitle}>Mix rain, water, fire and noise.</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scene: { minHeight: 200, padding: 21, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 22 },
  star: { position: 'absolute', backgroundColor: '#e7f0db' },
  moon: {
    position: 'absolute', top: 24, right: '16%', width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent, boxShadow: '0 0 24px rgba(207, 224, 194, .55)',
  },
  pine: { position: 'absolute', width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  shade: { ...StyleSheet.absoluteFill, top: '40%' },
  title: { color: colors.text, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 38, lineHeight: 44, letterSpacing: 0.4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, letterSpacing: 0.3, marginTop: 6 },
});
