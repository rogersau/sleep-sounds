import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  cleanMixName, favoritesFirst, formatRemaining, MAX_MIX_NAME, TIMER_MINUTES, FADE_SECONDS,
  type PersonalMix, type TimerSettings,
} from '../dist/session-settings.js';
import type { Levels } from './mix';
import { readPersonalMixes, savePersonalMixes } from './preferences';
import { colors } from './theme';

type ActionProps = {
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function Action({ label, accessibilityLabel, selected, disabled, onPress }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, selected && styles.selected, disabled && styles.disabled]}
    >
      <Text style={[styles.actionLabel, selected && styles.actionLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

type SleepTimerProps = {
  settings: TimerSettings;
  remaining: number | null;
  playing: boolean;
  finished: boolean;
  disabled: boolean;
  onChange: (settings: TimerSettings) => void;
};

export function SleepTimer({ settings, remaining, playing, finished, disabled, onChange }: SleepTimerProps) {
  const [expanded, setExpanded] = useState(false);
  let summary = settings.minutes ? settings.minutes + ' min' : 'Off';
  if (remaining != null && remaining > 0) summary = (playing ? '' : 'Paused · ') + formatRemaining(remaining);
  if (finished) summary = 'Finished';
  return (
    <View style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sleep timer"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(open => !open)}
        style={styles.header}
      >
        <Text style={styles.heading}>Sleep timer</Text>
        <Text style={styles.secondary}>{summary}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.body}>
          <Text style={styles.secondary}>Duration</Text>
          <View style={styles.actions}>
            {TIMER_MINUTES.map(minutes => (
              <Action
                key={minutes}
                label={minutes ? minutes + ' min' : 'Off'}
                accessibilityLabel={minutes ? minutes + ' minute timer' : 'Turn off sleep timer'}
                selected={settings.minutes === minutes}
                disabled={disabled}
                onPress={() => onChange({ ...settings, minutes })}
              />
            ))}
          </View>
          {settings.minutes > 0 && <>
            <Text style={styles.secondary}>Fade out</Text>
            <View style={styles.actions}>
              {FADE_SECONDS.map(fadeSeconds => (
                <Action
                  key={fadeSeconds}
                  label={fadeSeconds ? fadeSeconds + ' sec' : 'None'}
                  accessibilityLabel={fadeSeconds ? fadeSeconds + ' second fade out' : 'No fade out'}
                  selected={settings.fadeSeconds === fadeSeconds}
                  disabled={disabled}
                  onPress={() => onChange({ ...settings, fadeSeconds })}
                />
              ))}
            </View>
          </>}
        </View>
      )}
    </View>
  );
}

type SavedMixesProps = {
  levels: Levels;
  boost: number;
  disabled: boolean;
  onRecall: (mix: PersonalMix) => void;
};

export function SavedMixes({ levels, boost, disabled, onRecall }: SavedMixesProps) {
  const [expanded, setExpanded] = useState(false);
  const [mixes, setMixes] = useState(readPersonalMixes);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [fieldFocused, setFieldFocused] = useState(false);
  const field = useRef<ComponentRef<typeof TextInput>>(null);

  function resetForm() {
    setName('');
    setEditing(null);
  }

  function store(next: PersonalMix[], message: string) {
    try {
      savePersonalMixes(next);
      setMixes(next);
      setStatus(message);
      return true;
    } catch {
      setStatus('Could not save changes on this device.');
      return false;
    }
  }

  function save() {
    const label = cleanMixName(name);
    if (!label) {
      setStatus('Enter a name for the mix.');
      return;
    }
    if (mixes.some(mix => mix.name !== editing && mix.name.toLowerCase() === label.toLowerCase())) {
      setStatus('A mix with this name already exists.');
      return;
    }
    if (!editing && !levels.some(level => level > 0)) {
      setStatus('Turn up a sound before saving this mix.');
      return;
    }
    const next = editing
      ? mixes.map(mix => mix.name === editing ? { ...mix, name: label } : mix)
      : [...mixes, { name: label, favorite: false, levels, boost }];
    if (store(next, 'Saved ' + label + '.')) resetForm();
  }

  function remove(mix: PersonalMix) {
    Alert.alert('Delete saved mix?', mix.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          if (store(mixes.filter(item => item !== mix), 'Deleted ' + mix.name + '.') && editing === mix.name) {
            resetForm();
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(open => !open)}
        style={styles.header}
      >
        <Text style={styles.heading}>Saved mixes</Text>
        <Text style={styles.secondary}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.body}>
          {favoritesFirst(mixes).map(mix => {
            const selected = boost === mix.boost && mix.levels.every((value, index) => value === levels[index]);
            return (
              <View key={mix.name} style={styles.actions}>
                <Action
                  label={mix.name} accessibilityLabel={'Load mix ' + mix.name} selected={selected} disabled={disabled}
                  onPress={() => { onRecall(mix); setStatus('Loaded ' + mix.name + '.'); }}
                />
                <Action
                  label={mix.favorite ? 'Unstar' : 'Star'} accessibilityLabel={'Favorite ' + mix.name}
                  selected={mix.favorite} disabled={disabled}
                  onPress={() => store(
                    mixes.map(item => item === mix ? { ...mix, favorite: !mix.favorite } : item),
                    mix.favorite ? 'Removed from favorites.' : 'Added to favorites.',
                  )}
                />
                <Action
                  label="Rename" accessibilityLabel={'Rename ' + mix.name} disabled={disabled}
                  onPress={() => { setEditing(mix.name); setName(mix.name); field.current?.focus(); }}
                />
                <Action label="Delete" accessibilityLabel={'Delete ' + mix.name} disabled={disabled}
                  onPress={() => remove(mix)} />
              </View>
            );
          })}
          <Text style={styles.secondary}>Mix name</Text>
          <TextInput
            ref={field}
            accessibilityLabel="Mix name"
            editable={!disabled}
            maxLength={MAX_MIX_NAME}
            value={name}
            onChangeText={setName}
            onSubmitEditing={save}
            returnKeyType="done"
            onFocus={() => setFieldFocused(true)}
            onBlur={() => setFieldFocused(false)}
            style={[styles.input, fieldFocused && styles.inputFocused]}
          />
          <View style={styles.actions}>
            <Action label={editing ? 'Save name' : 'Save current mix'} disabled={disabled} onPress={save} />
            {editing && <Action label="Cancel" disabled={disabled} onPress={resetForm} />}
          </View>
          {Boolean(status) && <Text accessibilityLiveRegion="polite" style={styles.secondary}>{status}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  header: { minHeight: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  heading: { color: colors.accent, fontSize: 12, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase' },
  secondary: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  body: { paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  action: { minHeight: 44, maxWidth: '100%', justifyContent: 'center', borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.control, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  actionLabel: { color: colors.text, fontSize: 13 },
  actionLabelSelected: { color: colors.accent },
  selected: { backgroundColor: colors.selected, borderColor: colors.selectedBorder },
  disabled: { opacity: 0.6 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.hairline, borderRadius: 10, paddingHorizontal: 10, color: colors.text, backgroundColor: colors.control },
  inputFocused: { borderColor: colors.accent },
});
