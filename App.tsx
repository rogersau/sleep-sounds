import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SOUNDS, SOUND_GROUPS, PRESETS, levelsFor } from './dist/sound-library.js';
import { formatRemaining } from './dist/session-settings.js';
import { BottomSheet, SavedMixes, SleepTimer } from './mobile/SessionControls';
import { MiniPlayer } from './mobile/MiniPlayer';
import { SoundTile } from './mobile/SoundTile';
import { uiIcons } from './mobile/icons';
import { readLevels, saveLevels } from './mobile/preferences';
import { useSoundscape } from './mobile/useSoundscape';
import { masterMix, type Levels } from './mobile/mix';
import { colors } from './mobile/theme';

const icon = require('./dist/icon-192.png');
const presets = PRESETS.map(preset => ({ ...preset, levels: levelsFor(preset.mix) }));
const defaultSoundLevels = SOUNDS.map((_, index) => presets.find(preset => preset.levels[index] > 0)?.levels[index] ?? 60);

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
    <View style={styles.settingCard}>
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
        minimumTrackTintColor="#8cc4ff"
        maximumTrackTintColor={colors.hairlineStrong}
        thumbTintColor="#dce7f7"
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

function summarizeActive(levels: Levels) {
  const active = SOUNDS.map((sound, index) => ({ title: sound.title, level: levels[index] })).filter(item => item.level > 0);
  if (!active.length) return { subtitle: 'Night air, softly mixed.', dock: 'No sounds active', count: 0 };
  if (active.length === 1) {
    const label = `${active[0].title} · ${active[0].level}%`;
    return { subtitle: label, dock: label, count: 1 };
  }
  const names = active.slice(0, 2).map(item => item.title).join(', ');
  const extra = active.length > 2 ? ` +${active.length - 2}` : '';
  return {
    subtitle: `${names}${extra}`,
    dock: `${active.length} sounds · ${names}${extra}`,
    count: active.length,
  };
}

function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const [levels, setLevels] = useState(readLevels);
  const [boost, setBoost] = useState(100);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'timer' | 'saved' | 'settings' | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [draggingSound, setDraggingSound] = useState(false);
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

  function changeSound(index: number, value: number, commit: boolean) {
    const next = levels.map((level, i) => i === index ? value : level);
    if (commit) applyLevels(next);
    else audio.updateMix(next, boost);
  }

  function clearAll() {
    applyLevels(SOUNDS.map(() => 0));
    if (audio.playing) void audio.toggle(SOUNDS.map(() => 0), boost);
  }

  const summary = summarizeActive(levels);
  const boostDescription = masterMix(levels, boost).limited
    ? 'Headroom protection is active. The sound balance is unchanged.'
    : 'Increase gradually, especially with headphones.';
  const playbackStatus = audio.error
    ?? (audio.timerFinished ? 'Sleep timer finished'
      : audio.preparing ? 'Preparing audio…'
        : audio.playing ? 'Playing · Screen-off safe' : 'Tap play to listen');

  const timerActive = audio.timerSettings.minutes > 0;
  const timerBadge = audio.timerSettings.minutes
    ? audio.timerRemaining != null && audio.timerRemaining > 0
      ? formatRemaining(audio.timerRemaining)
      : `${audio.timerSettings.minutes}m`
    : 'Off';

  const orderedSounds = SOUND_GROUPS.flatMap(group =>
    SOUNDS.map((sound, index) => ({ sound, index })).filter(({ sound }) => sound.group === group),
  );
  const visibleSounds = activeGroup
    ? orderedSounds.filter(({ sound }) => sound.group === activeGroup)
    : orderedSounds;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        pointerEvents="none"
        colors={[audio.playing ? 'rgba(66, 112, 174, 0.26)' : 'rgba(56, 94, 146, 0.16)', 'rgba(7, 10, 15, 0)']}
        style={styles.ambientTop}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 112 + insets.bottom }]}
        scrollEnabled={!draggingSound}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topbar}>
            <View style={styles.brandWrap}>
              <Image source={icon} style={styles.appIcon} accessible={false} />
              <View style={styles.brandCopy}>
                <Text accessibilityRole="header" style={styles.appTitle}>Sleep Sounds</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{summary.subtitle}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Saved mixes"
                onPress={() => setSheet('saved')}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Image source={uiIcons.saved} style={styles.iconBtnImg} accessible={false} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => setSheet('settings')}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Image source={uiIcons.settings} style={styles.iconBtnImg} accessible={false} />
              </Pressable>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
            {presets.map(preset => {
              const selected = preset.levels.every((level, index) => level === levels[index]);
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: audio.preparing }}
                  disabled={audio.preparing}
                  style={({ pressed }) => [styles.preset, selected && styles.presetSelected, pressed && styles.pressed]}
                  onPress={() => applyLevels(preset.levels)}
                >
                  <Text style={[styles.presetText, selected && styles.presetTextSelected]}>{preset.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {[null, ...SOUND_GROUPS].map(group => {
                const count = group ? SOUNDS.filter(sound => sound.group === group).length : SOUNDS.length;
                const selected = activeGroup === group;
                return (
                  <Pressable
                    key={group ?? 'all'}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setActiveGroup(group)}
                    style={({ pressed }) => [styles.filterPill, selected && styles.filterPillSelected, pressed && styles.pressed]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {group ?? 'All'} {count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {summary.count > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear active sounds"
                disabled={audio.preparing}
                onPress={clearAll}
                style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.soundTiles}>
            {visibleSounds.map(({ sound, index }) => (
              <SoundTile
                key={sound.id}
                id={sound.id}
                title={sound.title}
                description={sound.description}
                value={levels[index]}
                defaultValue={defaultSoundLevels[index]}
                disabled={audio.preparing}
                onChange={(value, commit) => changeSound(index, value, commit)}
                onDragChange={setDraggingSound}
              />
            ))}
          </View>

          <Text style={styles.hint}>Tap to toggle · Drag across any tile for volume</Text>
        </View>
      </ScrollView>

      <View style={[styles.dockWrap, { bottom: 12 + insets.bottom }]} pointerEvents="box-none">
        <View style={styles.dockInner}>
          <MiniPlayer
            playing={audio.playing}
            preparing={audio.preparing}
            mixTitle={summary.dock}
            statusText={playbackStatus}
            isError={Boolean(audio.error)}
            timerBadge={timerBadge}
            timerActive={timerActive}
            onToggle={() => audio.toggle(levels, boost)}
            onOpenTimer={() => setSheet('timer')}
          />
        </View>
      </View>

      <BottomSheet visible={sheet === 'timer'} title="Sleep timer" onClose={() => setSheet(null)}>
        <SleepTimer
          settings={audio.timerSettings}
          remaining={audio.timerRemaining}
          playing={audio.playing}
          finished={audio.timerFinished}
          disabled={audio.preparing}
          onChange={audio.updateTimer}
        />
      </BottomSheet>

      <BottomSheet visible={sheet === 'saved'} title="Saved mixes" onClose={() => setSheet(null)}>
        <SavedMixes
          levels={levels}
          boost={boost}
          disabled={audio.preparing}
          onRecall={mix => {
            applyLevels(mix.levels, mix.boost);
            setSheet(null);
          }}
        />
      </BottomSheet>

      <BottomSheet visible={sheet === 'settings'} title="Settings" onClose={() => setSheet(null)}>
        <VolumeControl
          title="Volume boost"
          description={boostDescription}
          value={boost}
          min={100}
          max={150}
          step={5}
          disabled={audio.preparing}
          onChange={applyBoost}
        />

        <View style={styles.settingCard}>
          <Text style={styles.sectionLabel}>OFFLINE &amp; AUDIO CREDITS</Text>
          <Text style={styles.small}>
            Every sound is bundled for offline listening. Start playback before locking your screen.
          </Text>
          <Text style={styles.small}>
            Recordings are CC0. Noise tracks are generated.
          </Text>
          <View style={styles.creditsList}>
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
          </View>
          {linkError && (
            <Text accessibilityLiveRegion="polite" style={[styles.small, styles.error]}>
              The source link could not open.
            </Text>
          )}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><PlayerScreen /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ambientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 640,
    gap: 14,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  brandCopy: {
    flex: 1,
    gap: 1,
  },
  appTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnImg: {
    width: 19,
    height: 19,
    tintColor: colors.muted,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  preset: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  presetSelected: {
    backgroundColor: colors.pillActiveBg,
    borderColor: colors.pillActiveBorder,
  },
  presetText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  presetTextSelected: {
    color: colors.text,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filters: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
  },
  filterPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  filterPillSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  filterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextSelected: {
    color: colors.text,
  },
  clearBtn: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
  },
  clearText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  soundTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 11,
  },
  hint: {
    color: colors.dim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  dockWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  dockInner: {
    width: '100%',
    maxWidth: 640,
  },
  settingCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 8,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  levelLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  levelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  levelValue: {
    color: '#8cc4ff',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  slider: {
    height: 38,
  },
  small: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  creditsList: {
    gap: 6,
    marginTop: 4,
  },
  link: {
    color: '#8cc4ff',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  error: {
    color: colors.error,
  },
  pressed: {
    opacity: 0.78,
  },
});
