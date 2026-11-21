import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ForestScene } from './mobile/ForestScene';
import { readLevels, saveLevels } from './mobile/preferences';
import { useSoundscape } from './mobile/useSoundscape';
import { masterMix, type Levels } from './mobile/mix';

const icon = require('./dist/icon-192.png');
const colors = {
  background: '#10241f', panel: '#192e27', border: '#3c5146',
  text: '#f1eee2', muted: '#bac9bc', accent: '#d5dfb7', dark: '#263724',
};

type VolumeControlProps = {
  title: string;
  description: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function VolumeControl({ title, description, value, min = 0, max = 100, step = 1, disabled, onChange }: VolumeControlProps) {
  const [preview, setPreview] = useState<number | null>(null);
  return (
    <View>
      <View style={styles.levelLabel}>
        <Text style={styles.levelTitle}>{title}</Text>
        <Text style={styles.levelValue}>{Math.round(preview ?? value)}%</Text>
      </View>
      <Slider
        style={styles.slider}
        accessibilityLabel={title}
        accessibilityHint={description}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        disabled={disabled}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
        onValueChange={setPreview}
        onSlidingComplete={next => {
          setPreview(null);
          onChange(Math.round(next));
        }}
      />
      <Text style={styles.small}>{description}</Text>
    </View>
  );
}

function PlayerScreen() {
  const [levels, setLevels] = useState(readLevels);
  const [boost, setBoost] = useState(100);
  const [helpOpen, setHelpOpen] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const audio = useSoundscape();

  function applyLevels(next: Levels) {
    setLevels(next);
    saveLevels(next);
    audio.updateMix(next, boost);
  }

  function applyBoost(next: number) {
    setBoost(next);
    audio.updateMix(levels, next);
  }

  const boostDescription = masterMix(levels, boost).limited
    ? 'Headroom protection is active. The sound balance is unchanged.'
    : 'Increase gradually, especially with headphones.';
  const playbackLabel = audio.preparing ? 'Preparing audio' : audio.playing ? 'Pause' : 'Start listening';
  const playbackStatus = audio.error ?? (audio.preparing
    ? 'Preparing audio…'
    : audio.playing ? 'Playing · You can lock your screen' : 'Start at a comfortable volume.');

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Image source={icon} style={styles.icon} accessible={false} />
            <Text style={styles.brandText}>SLEEP SOUNDS</Text>
          </View>

          <ForestScene />

          <View style={styles.panel}>
            <View style={styles.playerHeading}>
              <Text accessibilityRole="header" style={styles.heading}>Under the canopy</Text>
              <Text style={styles.small}>Continuous loop</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.play, pressed && styles.pressed, audio.preparing && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={playbackLabel}
              accessibilityState={{ disabled: audio.preparing, busy: audio.preparing }}
              disabled={audio.preparing}
              onPress={() => audio.toggle(levels, boost)}
            >
              {audio.preparing
                ? <ActivityIndicator color={colors.dark} />
                : <Text style={styles.playSymbol}>{audio.playing ? 'Ⅱ' : '▶'}</Text>}
              <Text style={styles.playText}>{playbackLabel}</Text>
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={[styles.small, styles.status, audio.error && styles.error]}>
              {playbackStatus}
            </Text>

            <View style={styles.controls}>
              <VolumeControl
                title="Rain"
                description="Natural rainfall with no added sound."
                value={levels[0]}
                disabled={audio.preparing}
                onChange={value => applyLevels([value, levels[1]])}
              />
              <VolumeControl
                title="Optional pink noise"
                description="Off by default. Raise this slider to add it."
                value={levels[1]}
                disabled={audio.preparing}
                onChange={value => applyLevels([levels[0], value])}
              />
              <View style={styles.presets}>
                {([[70, 'Rain only'], [90, 'Louder rain']] as const).map(([rain, label]) => {
                  const selected = levels[0] === rain && levels[1] === 0;
                  return (
                    <Pressable
                      key={rain}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: audio.preparing }}
                      disabled={audio.preparing}
                      style={({ pressed }) => [styles.preset, selected && styles.selected, pressed && styles.pressed]}
                      onPress={() => applyLevels([rain, 0])}
                    >
                      <Text style={styles.presetText}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <VolumeControl
                title="Overall volume boost"
                description={boostDescription}
                value={boost}
                min={100}
                max={150}
                step={5}
                disabled={audio.preparing}
                onChange={applyBoost}
              />
            </View>
          </View>

          <View style={styles.help}>
            <Pressable
              style={styles.helpToggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: helpOpen }}
              onPress={() => setHelpOpen(open => !open)}
            >
              <Text style={styles.helpTitle}>Offline listening & audio credits</Text>
              <Text style={styles.helpTitle} accessibilityElementsHidden importantForAccessibility="no">{helpOpen ? '−' : '+'}</Text>
            </Pressable>
            {helpOpen && <View style={styles.helpBody}>
              <Text style={styles.small}>The installed app includes both sounds. Start playback before locking your screen. Calls and system settings may interrupt background playback.</Text>
              <Text style={styles.small}>Rain is an edit of AMB Rain Loop 2 by Kresiek The Furry, offered under CC0 1.0. Pink noise is generated separately.</Text>
              <Text
                accessibilityRole="link"
                style={styles.link}
                onPress={() => {
                  setLinkError(false);
                  void Linking.openURL('https://opengameart.org/content/amb-rain-loop-2').catch(() => setLinkError(true));
                }}
              >
                View the original recording
              </Text>
              {linkError && <Text accessibilityLiveRegion="polite" style={[styles.small, styles.error]}>The source link could not open.</Text>}
            </View>}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><PlayerScreen /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center' },
  content: { width: '100%', maxWidth: 600, gap: 14 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },
  icon: { width: 36, height: 36, borderRadius: 10 },
  brandText: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 2.3 },
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 20 },
  playerHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  heading: { color: colors.text, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 27, flexShrink: 1 },
  play: { backgroundColor: colors.accent, minHeight: 56, padding: 10, borderRadius: 12, marginTop: 16, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center' },
  playText: { color: colors.dark, fontSize: 16, fontWeight: '700' },
  playSymbol: { color: colors.dark, fontSize: 16 },
  pressed: { opacity: 0.77 },
  disabled: { opacity: 0.82 },
  small: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  status: { textAlign: 'center', marginTop: 10, marginBottom: 20 },
  error: { color: '#f2bdac' },
  controls: { gap: 17 },
  levelLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  levelTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  levelValue: { color: colors.accent, fontSize: 13, fontVariant: ['tabular-nums'] },
  slider: { height: 40 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { borderColor: colors.border, borderWidth: 1, borderRadius: 24, minHeight: 44, justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 14 },
  selected: { borderColor: '#849567', backgroundColor: '#354634' },
  presetText: { color: colors.text, fontSize: 13 },
  help: { borderColor: colors.border, borderWidth: 1, borderRadius: 16 },
  helpToggle: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, minHeight: 52, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 },
  helpTitle: { color: colors.text, fontSize: 14, flexShrink: 1 },
  helpBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  link: { color: colors.accent, fontSize: 13, textDecorationLine: 'underline' },
});
