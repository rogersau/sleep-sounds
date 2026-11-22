import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { SOUNDS, SOUND_GROUPS, PRESETS, levelsFor } from './dist/sound-library.js';
import { SavedMixes, SleepTimer } from './mobile/SessionControls';
import { ForestScene } from './mobile/ForestScene';
import { readLevels, saveLevels } from './mobile/preferences';
import { useSoundscape } from './mobile/useSoundscape';
import { masterMix, type Levels } from './mobile/mix';
import { colors } from './mobile/theme';

const icon = require('./dist/icon-192.png');
const presets = PRESETS.map(preset => ({ ...preset, levels: levelsFor(preset.mix) }));

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

  function applyLevels(next: Levels, nextBoost = boost) {
    setLevels(next);
    setBoost(nextBoost);
    saveLevels(next);
    audio.updateMix(next, nextBoost);
  }

  function applyBoost(next: number) {
    setBoost(next);
    audio.updateMix(levels, next);
  }

  const boostDescription = masterMix(levels, boost).limited
    ? 'Headroom protection is active. The sound balance is unchanged.'
    : 'Increase gradually, especially with headphones.';
  const playbackLabel = audio.preparing ? 'Preparing audio' : audio.playing ? 'Pause' : 'Start listening';
  const playbackStatus = audio.error ?? (audio.timerFinished ? 'Sleep timer finished.' : audio.preparing
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
              <Text accessibilityRole="header" style={styles.heading}>Your soundscape</Text>
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
              <LinearGradient colors={['#e9f1dd', colors.accent]} style={styles.playGradient} />
              {audio.preparing
                ? <ActivityIndicator color={colors.dark} />
                : <Text style={styles.playSymbol}>{audio.playing ? 'Ⅱ' : '▶'}</Text>}
              <Text style={styles.playText}>{playbackLabel}</Text>
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={[styles.small, styles.status, audio.error && styles.error]}>
              {playbackStatus}
            </Text>

            <View style={styles.controls}>
              <SleepTimer
                settings={audio.timerSettings}
                remaining={audio.timerRemaining}
                playing={audio.playing}
                finished={audio.timerFinished}
                disabled={audio.preparing}
                onChange={audio.updateTimer}
              />
              <View style={styles.presets}>
                {presets.map(preset => {
                  const selected = preset.levels.every((level, index) => level === levels[index]);
                  return (
                    <Pressable
                      key={preset.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: audio.preparing }}
                      disabled={audio.preparing}
                      style={({ pressed }) => [styles.preset, selected && styles.selected, pressed && styles.pressed]}
                      onPress={() => applyLevels(preset.levels)}
                    >
                      <Text style={[styles.presetText, selected && styles.presetTextSelected]}>{preset.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <SavedMixes levels={levels} boost={boost} disabled={audio.preparing}
                onRecall={mix => applyLevels(mix.levels, mix.boost)} />
              {SOUND_GROUPS.map(group => (
                <View key={group} style={styles.soundGroup}>
                  <Text accessibilityRole="header" style={styles.groupTitle}>{group}</Text>
                  {SOUNDS.map((sound, index) => sound.group === group && (
                    <VolumeControl
                      key={sound.id}
                      title={sound.title}
                      description={sound.description}
                      value={levels[index]}
                      disabled={audio.preparing}
                      onChange={value => applyLevels(levels.map((level, i) => i === index ? value : level))}
                    />
                  ))}
                </View>
              ))}
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
              <Text style={styles.small}>Every sound is included for offline listening. Start playback before locking your screen. Calls and system settings may interrupt playback.</Text>
              <Text style={styles.small}>Nature recordings are CC0. The three noise tracks are generated.</Text>
              {SOUNDS.map(sound => 'source' in sound && (
                <Text
                  key={sound.id}
                  accessibilityRole="link"
                  style={styles.link}
                  onPress={() => {
                    setLinkError(false);
                    void Linking.openURL(sound.source).catch(() => setLinkError(true));
                  }}
                >
                  {sound.title} · {sound.credit}
                </Text>
              ))}
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  icon: { width: 36, height: 36, borderRadius: 12 },
  brandText: { color: colors.accent, fontSize: 12, fontWeight: '600', letterSpacing: 2.3 },
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 20 },
  playerHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  heading: { color: colors.text, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 27, lineHeight: 33, letterSpacing: 0.3, flexShrink: 1 },
  play: {
    minHeight: 58, padding: 10, borderRadius: 999, marginTop: 18, overflow: 'hidden',
    flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 14px 40px -14px rgba(207, 224, 194, .45)',
  },
  playGradient: { ...StyleSheet.absoluteFill, borderRadius: 999 },
  playText: { color: colors.dark, fontSize: 16, fontWeight: '600' },
  playSymbol: { color: colors.dark, fontSize: 17 },
  pressed: { opacity: 0.77 },
  disabled: { opacity: 0.82 },
  small: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  status: { textAlign: 'center', marginTop: 10, marginBottom: 20 },
  error: { color: colors.error },
  controls: { gap: 17 },
  soundGroup: { gap: 15, borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 },
  groupTitle: { color: colors.accent, fontSize: 12, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase' },
  levelLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  levelTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  levelValue: { color: colors.accent, fontSize: 13, fontVariant: ['tabular-nums'] },
  slider: { height: 40 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { borderColor: colors.hairline, borderWidth: 1, backgroundColor: colors.control, borderRadius: 999, minHeight: 44, justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 16 },
  selected: { borderColor: colors.selectedBorder, backgroundColor: colors.selected },
  presetText: { color: colors.text, fontSize: 13 },
  presetTextSelected: { color: colors.accent },
  help: { borderColor: colors.border, borderWidth: 1, borderRadius: 16 },
  helpToggle: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, minHeight: 52, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 },
  helpTitle: { color: colors.text, fontSize: 14, flexShrink: 1 },
  helpBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  link: { color: colors.accent, fontSize: 13, textDecorationLine: 'underline' },
});
