import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View } from 'react-native';

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

export function ForestScene() {
  return (
    <LinearGradient colors={['#29453e', '#192f29', '#0f211c']} style={styles.scene}>
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
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
                borderBottomColor: back ? '#244139' : '#142a23',
              },
            ]}
          />
        ))}
        <LinearGradient colors={['#0d201900', '#0d2019']} style={styles.shade} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>A little rain.</Text>
      <Text style={styles.subtitle}>Natural rainfall with optional pink noise.</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scene: { minHeight: 200, padding: 21, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 22 },
  moon: { position: 'absolute', top: 24, right: '16%', width: 40, height: 40, borderRadius: 20, backgroundColor: '#c3cdae' },
  pine: { position: 'absolute', width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  shade: { ...StyleSheet.absoluteFill, top: '40%' },
  title: { color: '#f1eee2', fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 38 },
  subtitle: { color: '#c8d2c3', fontSize: 14, marginTop: 6 },
});
