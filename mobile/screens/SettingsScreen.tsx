import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radii } from '../constants/theme';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionTitle } from '../components/SectionTitle';
import type { RootStackParamList } from '../navigation/types';
import { asBoolean } from '../lib/asBoolean';
import { AuthHttpError } from '../services/http';
import {
  getSettings,
  putSettings,
  type SettingsResponse,
  type UpdateSettingsBody,
} from '../services/users';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function SettingsScreen({ navigation }: Props) {
  const { signOut, refreshSettings } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateSettingsBody | null>(null);

  const hydrate = useCallback(
    (r: SettingsResponse): UpdateSettingsBody => ({
      focusDuration: r.focusDuration,
      breakDuration: r.breakDuration,
      theme: (r.theme || 'light').trim() || 'light',
      longBreakDuration: r.longBreakDuration,
      sessionsUntilLongBreak: r.sessionsUntilLongBreak,
      notifySessionReminders: asBoolean(r.notifySessionReminders, true),
      notifyBreakReminders: asBoolean(r.notifyBreakReminders, true),
      notifyAchievements: asBoolean(r.notifyAchievements, true),
      soundEffects: asBoolean(r.soundEffects, false),
      autoStartSessions: asBoolean(r.autoStartSessions, true),
    }),
    [],
  );

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await getSettings();
      setForm(hydrate(r));
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load settings.');
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [hydrate, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    const body: UpdateSettingsBody = {
      ...form,
      focusDuration: clampInt(form.focusDuration, 1, 180),
      breakDuration: clampInt(form.breakDuration, 1, 60),
      longBreakDuration: clampInt(form.longBreakDuration, 1, 60),
      sessionsUntilLongBreak: clampInt(form.sessionsUntilLongBreak, 2, 10),
      notifySessionReminders: asBoolean(form.notifySessionReminders, true),
      notifyBreakReminders: asBoolean(form.notifyBreakReminders, true),
      notifyAchievements: asBoolean(form.notifyAchievements, true),
      soundEffects: asBoolean(form.soundEffects, false),
      autoStartSessions: asBoolean(form.autoStartSessions, true),
    };
    try {
      const r = await putSettings(body);
      setForm(hydrate(r));
      await refreshSettings();
      navigation.goBack();
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  function patch<K extends keyof UpdateSettingsBody>(key: K, value: UpdateSettingsBody[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
      >
        {loading ? <Text style={styles.muted}>Loading…</Text> : null}
        {error ? (
          <Card style={styles.errCard}>
            <Text style={styles.err}>{error}</Text>
          </Card>
        ) : null}

        {form ? (
          <>
            <Card style={styles.cardSpacer}>
              <SectionTitle>Timers</SectionTitle>
              <NumberRow
                label="Focus (minutes)"
                value={form.focusDuration}
                onCommit={(n) => patch('focusDuration', n)}
              />
              <NumberRow
                label="Break (minutes)"
                value={form.breakDuration}
                onCommit={(n) => patch('breakDuration', n)}
              />
              <NumberRow
                label="Long break (minutes)"
                value={form.longBreakDuration}
                onCommit={(n) => patch('longBreakDuration', n)}
              />
              <NumberRow
                label="Sessions until long break"
                value={form.sessionsUntilLongBreak}
                onCommit={(n) => patch('sessionsUntilLongBreak', n)}
              />
              <ToggleRow
                label="Auto-start sessions (web Focus page)"
                value={form.autoStartSessions}
                onValueChange={(v) => patch('autoStartSessions', v)}
              />
              <Text style={styles.help}>
                When on, focus and breaks chain automatically on the web app until the long break. When off, you
                start each round manually.
              </Text>
            </Card>

            <Card style={styles.cardSpacer}>
              <SectionTitle>Appearance</SectionTitle>
              <Text style={styles.help}>Theme syncs with your account (mobile stays light for now).</Text>
              <ThemeChip
                active={form.theme === 'light'}
                label="Light"
                onPress={() => patch('theme', 'light')}
              />
              <ThemeChip
                active={form.theme === 'dark'}
                label="Dark"
                onPress={() => patch('theme', 'dark')}
              />
            </Card>

            <Card style={styles.cardSpacer}>
              <SectionTitle>Notifications & sound</SectionTitle>
              <ToggleRow
                label="Session reminders"
                value={form.notifySessionReminders}
                onValueChange={(v) => patch('notifySessionReminders', v)}
              />
              <ToggleRow
                label="Break reminders"
                value={form.notifyBreakReminders}
                onValueChange={(v) => patch('notifyBreakReminders', v)}
              />
              <ToggleRow
                label="Achievements"
                value={form.notifyAchievements}
                onValueChange={(v) => patch('notifyAchievements', v)}
              />
              <ToggleRow
                label="Sound effects"
                value={form.soundEffects}
                onValueChange={(v) => patch('soundEffects', v)}
              />
            </Card>

            <PrimaryButton label={saving ? 'Saving…' : 'Save changes'} onPress={() => void save()} loading={saving} />
            <Pressable
              onPress={() => navigation.goBack()}
              disabled={saving}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelPressed, saving && styles.cancelDisabled]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function NumberRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          const n = Number.parseInt(t, 10);
          if (Number.isFinite(n)) onCommit(n);
        }}
        onBlur={() => {
          const n = Number.parseInt(text, 10);
          if (!Number.isFinite(n)) setText(String(value));
          else setText(String(n));
        }}
        keyboardType="number-pad"
        style={styles.input}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.track }}
        thumbColor={Boolean(value) ? colors.primary : '#f4f4f5'}
      />
    </View>
  );
}

function ThemeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, paddingTop: 8 },
  cardSpacer: { marginBottom: 14 },
  muted: { color: colors.textMuted, marginBottom: 8 },
  errCard: { borderWidth: 1, borderColor: colors.errorBorder, backgroundColor: colors.errorBg },
  err: { color: colors.errorText },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: 12,
  },
  help: { fontSize: 13, color: colors.textSoft, marginBottom: 12, lineHeight: 18 },
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.track,
  },
  chipText: {
    fontWeight: '700',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primary,
  },
  cancelBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelPressed: {
    opacity: 0.7,
  },
  cancelDisabled: {
    opacity: 0.45,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
