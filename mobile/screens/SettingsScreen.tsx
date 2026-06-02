import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radii } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionTitle } from '../components/SectionTitle';
import type { RootStackParamList } from '../navigation/types';
import { asBoolean } from '../lib/asBoolean';
import { AuthHttpError } from '../services/http';
import {
  getSettings,
  patchProfile,
  putSettings,
  type SettingsResponse,
  type UpdateSettingsBody,
} from '../services/users';
import { useAuth } from '../context/AuthContext';
import { ensureNotificationPermission } from '../lib/notifications';
import { compressAvatarUri } from '../lib/avatarImage';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function SettingsScreen({ navigation }: Props) {
  const { user, signOut, refreshSettings, refreshUser } = useAuth();
  const c = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        scroll: { padding: 18, paddingTop: 8 },
        cardSpacer: { marginBottom: 14 },
        muted: { color: c.textMuted, marginBottom: 8 },
        errCard: { borderWidth: 1, borderColor: c.errorBorder, backgroundColor: c.errorBg },
        err: { color: c.errorText },
        field: { marginBottom: 14 },
        fieldLabel: { fontSize: 14, fontWeight: '600', color: c.textMuted, marginBottom: 8 },
        input: {
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radii.sm,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
          color: c.text,
          backgroundColor: c.surface,
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
          color: c.textSecondary,
          fontWeight: '600',
          marginRight: 12,
        },
        help: { fontSize: 13, color: c.textSoft, marginBottom: 12, lineHeight: 18, display: 'none' as const },
        chip: {
          alignSelf: 'flex-start',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: radii.pill,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: c.border,
          marginBottom: 10,
        },
        chipActive: {
          borderColor: c.primary,
          backgroundColor: c.track,
        },
        chipText: {
          fontWeight: '700',
          color: c.textMuted,
        },
        chipTextActive: {
          color: c.text,
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
          color: c.textMuted,
        },
        avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
        avatarPreview: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: c.primary,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        avatarImg: { width: 72, height: 72 },
        avatarFallback: { fontSize: 28, fontWeight: '800', color: c.onPrimary },
        avatarActions: { flex: 1, gap: 8 },
        avatarBtn: {
          alignSelf: 'flex-start',
          backgroundColor: c.primary,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: radii.sm,
        },
        avatarBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },
        avatarRemove: { color: c.errorText, fontWeight: '600', fontSize: 14 },
      }),
    [c],
  );
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateSettingsBody | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

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

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.avatar !== undefined) setAvatarUri(user.avatar ?? null);
  }, [user?.name, user?.avatar]);

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
      const wantsNotify =
        body.notifySessionReminders || body.notifyBreakReminders || body.notifyAchievements;
      if (wantsNotify) {
        await ensureNotificationPermission();
      }

      const r = await putSettings(body);
      setForm(hydrate(r));
      await refreshSettings();
      if (displayName.trim() && displayName.trim() !== user?.name) {
        await patchProfile({ name: displayName.trim() });
        await refreshUser();
      }
      if (avatarUri !== (user?.avatar ?? null)) {
        await patchProfile({ avatar: avatarUri });
        await refreshUser();
      }
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

  async function pickAvatar() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is required to choose a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      setAvatarUri(await compressAvatarUri(result.assets[0].uri));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not process photo.');
    }
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
              <SectionTitle>Account</SectionTitle>
              <View style={styles.avatarRow}>
                <View style={styles.avatarPreview}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarFallback}>
                      {(displayName.trim()[0] ?? user?.name?.[0] ?? 'U').toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.avatarActions}>
                  <Pressable style={styles.avatarBtn} onPress={() => void pickAvatar()}>
                    <Text style={styles.avatarBtnText}>Choose photo</Text>
                  </Pressable>
                  {avatarUri ? (
                    <Pressable onPress={() => setAvatarUri(null)}>
                      <Text style={styles.avatarRemove}>Remove photo</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text style={styles.fieldLabel}>Display name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={32}
                autoCapitalize="words"
              />
            </Card>

            <Card style={styles.cardSpacer}>
              <SectionTitle>Timers</SectionTitle>
              <NumberRow
                label="Focus (minutes)"
                value={form.focusDuration}
                onCommit={(n) => patch('focusDuration', n)}
                styles={styles}
              />
              <NumberRow
                label="Break (minutes)"
                value={form.breakDuration}
                onCommit={(n) => patch('breakDuration', n)}
                styles={styles}
              />
              <NumberRow
                label="Long break (minutes)"
                value={form.longBreakDuration}
                onCommit={(n) => patch('longBreakDuration', n)}
                styles={styles}
              />
              <NumberRow
                label="Sessions until long break"
                value={form.sessionsUntilLongBreak}
                onCommit={(n) => patch('sessionsUntilLongBreak', n)}
                styles={styles}
              />
              <ToggleRow
                label="Auto-start sessions"
                value={form.autoStartSessions}
                onValueChange={(v) => patch('autoStartSessions', v)}
                styles={styles}
                colors={c}
              />
            </Card>

            <Card style={styles.cardSpacer}>
              <SectionTitle>Appearance</SectionTitle>
              <ThemeChip
                active={form.theme === 'light'}
                label="Light"
                onPress={() => patch('theme', 'light')}
                styles={styles}
              />
              <ThemeChip
                active={form.theme === 'dark'}
                label="Dark"
                onPress={() => patch('theme', 'dark')}
                styles={styles}
              />
            </Card>

            <Card style={styles.cardSpacer}>
              <SectionTitle>Notifications & sound</SectionTitle>
              <ToggleRow
                label="Session reminders"
                value={form.notifySessionReminders}
                onValueChange={(v) => patch('notifySessionReminders', v)}
                styles={styles}
                colors={c}
              />
              <ToggleRow
                label="Break reminders"
                value={form.notifyBreakReminders}
                onValueChange={(v) => patch('notifyBreakReminders', v)}
                styles={styles}
                colors={c}
              />
              <ToggleRow
                label="Achievements"
                value={form.notifyAchievements}
                onValueChange={(v) => patch('notifyAchievements', v)}
                styles={styles}
                colors={c}
              />
              <ToggleRow
                label="Sound effects"
                value={form.soundEffects}
                onValueChange={(v) => patch('soundEffects', v)}
                styles={styles}
                colors={c}
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
  styles,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  styles: ReturnType<typeof StyleSheet.create>;
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
  styles,
  colors: themeColors,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  styles: ReturnType<typeof StyleSheet.create>;
  colors: { border: string; track: string; primary: string };
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        trackColor={{ false: themeColors.border, true: themeColors.track }}
        thumbColor={Boolean(value) ? themeColors.primary : '#f4f4f5'}
      />
    </View>
  );
}

function ThemeChip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof StyleSheet.create>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}
