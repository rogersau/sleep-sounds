import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cleanMixName, favoritesFirst, formatRemaining, MAX_MIX_NAME, TIMER_MINUTES, FADE_SECONDS,
  type PersonalMix, type TimerSettings,
} from '../dist/session-settings.js';
import { uiIcons } from './icons';
import type { Levels } from './mix';
import { readPersonalMixes, savePersonalMixes } from './preferences';
import { colors } from './theme';

type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.modalWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close sheet" />
        <View style={[styles.sheetCard, { paddingBottom: Math.max(22, insets.bottom + 14) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Image source={uiIcons.close} style={styles.closeIcon} accessible={false} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ChipProps = {
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function Chip({ label, accessibilityLabel, selected, primary, disabled, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        primary && styles.chipPrimary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[
        styles.chipLabel,
        selected && styles.chipLabelSelected,
        primary && styles.chipLabelPrimary,
      ]}>
        {label}
      </Text>
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
  let status = '';
  if (finished) status = 'Sleep timer finished.';
  else if (remaining != null && remaining > 0) {
    status = (playing ? '' : 'Paused · ') + formatRemaining(remaining) + ' left';
  } else if (settings.minutes > 0) {
    status = `${settings.minutes} min timer ready`;
  }

  return (
    <View style={styles.sectionStack}>
      <View style={styles.group}>
        <Text style={styles.sectionLabel}>DURATION</Text>
        <View style={styles.actions}>
          {TIMER_MINUTES.map(minutes => (
            <Chip
              key={minutes}
              label={minutes ? minutes + ' min' : 'Off'}
              accessibilityLabel={minutes ? minutes + ' minute timer' : 'Turn off sleep timer'}
              selected={settings.minutes === minutes}
              disabled={disabled}
              onPress={() => onChange({ ...settings, minutes })}
            />
          ))}
        </View>
      </View>

      {settings.minutes > 0 && (
        <View style={styles.group}>
          <Text style={styles.sectionLabel}>FADE OUT</Text>
          <View style={styles.actions}>
            {FADE_SECONDS.map(fadeSeconds => (
              <Chip
                key={fadeSeconds}
                label={fadeSeconds ? fadeSeconds + ' sec' : 'None'}
                accessibilityLabel={fadeSeconds ? fadeSeconds + ' second fade out' : 'No fade out'}
                selected={settings.fadeSeconds === fadeSeconds}
                disabled={disabled}
                onPress={() => onChange({ ...settings, fadeSeconds })}
              />
            ))}
          </View>
        </View>
      )}

      {Boolean(status) && <Text style={styles.note}>{status}</Text>}
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
    <View style={styles.sectionStack}>
      {mixes.length > 0 && (
        <View style={styles.mixList}>
          {favoritesFirst(mixes).map(mix => {
            const selected = boost === mix.boost && mix.levels.every((value, index) => value === levels[index]);
            return (
              <View key={mix.name} style={[styles.mixCard, selected && styles.mixCardSelected]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Load mix ' + mix.name}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => { onRecall(mix); setStatus('Loaded ' + mix.name + '.'); }}
                  style={styles.mixLoad}
                >
                  <Text style={[styles.mixName, selected && styles.mixNameSelected]} numberOfLines={1}>
                    {mix.name}
                  </Text>
                </Pressable>
                <View style={styles.mixActions}>
                  <Chip
                    label={mix.favorite ? 'Starred' : 'Star'}
                    accessibilityLabel={'Favorite ' + mix.name}
                    selected={mix.favorite}
                    disabled={disabled}
                    onPress={() => store(
                      mixes.map(item => item === mix ? { ...mix, favorite: !mix.favorite } : item),
                      mix.favorite ? 'Removed from favorites.' : 'Added to favorites.',
                    )}
                  />
                  <Chip
                    label="Rename"
                    accessibilityLabel={'Rename ' + mix.name}
                    disabled={disabled}
                    onPress={() => { setEditing(mix.name); setName(mix.name); field.current?.focus(); }}
                  />
                  <Chip
                    label="Delete"
                    accessibilityLabel={'Delete ' + mix.name}
                    disabled={disabled}
                    onPress={() => remove(mix)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.group}>
        <Text style={styles.sectionLabel}>{editing ? 'RENAME MIX' : 'SAVE CURRENT MIX'}</Text>
        <TextInput
          ref={field}
          accessibilityLabel="Mix name"
          placeholder="e.g. Rainy cabin"
          placeholderTextColor={colors.dim}
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
          <Chip label={editing ? 'Save name' : 'Save mix'} primary disabled={disabled} onPress={save} />
          {editing && <Chip label="Cancel" disabled={disabled} onPress={resetForm} />}
        </View>
      </View>

      {Boolean(status) && <Text accessibilityLiveRegion="polite" style={styles.note}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 6, 10, 0.72)',
  },
  sheetCard: {
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '82%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 16,
    height: 16,
    tintColor: colors.muted,
  },
  sheetBody: {
    gap: 16,
    paddingBottom: 6,
  },
  sectionStack: {
    gap: 16,
  },
  group: {
    gap: 10,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: colors.timerActiveBg,
    borderColor: colors.timerActiveBorder,
  },
  chipPrimary: {
    backgroundColor: colors.accent,
    borderColor: 'transparent',
  },
  chipLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '500',
  },
  chipLabelSelected: {
    color: colors.text,
  },
  chipLabelPrimary: {
    color: colors.accentInk,
    fontWeight: '600',
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.5 },
  note: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  mixList: {
    gap: 10,
  },
  mixCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 10,
  },
  mixCardSelected: {
    borderColor: colors.timerActiveBorder,
    backgroundColor: 'rgba(140, 196, 255, 0.07)',
  },
  mixLoad: {
    paddingVertical: 2,
  },
  mixName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  mixNameSelected: {
    color: colors.timerActiveText,
  },
  mixActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    fontSize: 14,
  },
  inputFocused: {
    borderColor: '#8cc4ff',
  },
});
