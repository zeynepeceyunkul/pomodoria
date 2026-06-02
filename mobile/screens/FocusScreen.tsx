import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radii } from '../constants/theme';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { useFocusTimer } from '../context/FocusTimerContext';
import { useAuth } from '../context/AuthContext';
import { useTabContentPadding } from '../hooks/useTabContentPadding';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { ThemeColors } from '../hooks/useThemeColors';
import { xpIntoCurrentLevel, xpThresholdForCurrentTier, XP_PER_LEVEL } from '../lib/xpDisplay';
import { getMyTasks, type TaskRecord } from '../services/tasks';

function formatClock(totalSec: number): string {
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function FocusScreen() {
  const styles = useThemedStyles(createFocusStyles);
  const { user } = useAuth();
  const bottomPad = useTabContentPadding(24);
  const t = useFocusTimer();
  const [openTasks, setOpenTasks] = useState<TaskRecord[]>([]);

  useEffect(() => {
    void getMyTasks()
      .then((list) => setOpenTasks(list.filter((task) => task.status !== 'completed')))
      .catch(() => setOpenTasks([]));
  }, []);

  const totalSec =
    t.phase === 'focus'
      ? Math.max(1, t.focusMinutes) * 60
      : Math.max(1, t.activeBreakMinutes) * 60;

  const primary = t.isRunning
    ? 'Pause'
    : t.remainingSec <= 0 || t.remainingSec === totalSec
      ? t.phase === 'focus'
        ? 'Start Focus'
        : 'Start Break'
      : 'Resume';

  const xpLine = useMemo(() => {
    if (!user) return null;
    const xp = user.xp ?? 0;
    const into = xpIntoCurrentLevel(xp);
    const threshold = xpThresholdForCurrentTier(xp);
    const pct = Math.min(100, Math.round((into / XP_PER_LEVEL) * 100));
    return { pct, xp, threshold, level: user.level ?? 1 };
  }, [user]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Focus</Text>

        <View style={styles.backdrop}>
          <View style={[styles.badge, t.phase === 'break' && styles.badgeBreak]}>
            <Text style={[styles.badgeText, t.phase === 'break' && styles.badgeTextBreak]}>
              {t.phase === 'focus' ? 'Focus mode' : 'Break time'}
            </Text>
          </View>

          <Card style={styles.timerCard}>
            <Text style={styles.label}>
              {t.phase === 'focus' ? 'Focus session' : 'Break session'}
            </Text>
            <Text style={styles.timer}>{formatClock(t.remainingSec)}</Text>
            <Text style={styles.hint}>
              {t.phase === 'focus'
                ? `${t.focusMinutes} min · next: ${t.nextBreakIsLong ? 'long break' : 'short break'}`
                : `${t.activeBreakMinutes} min`}
            </Text>

            {t.phase === 'focus' && openTasks.length > 0 ? (
              <View style={styles.taskPicker}>
                <Text style={styles.taskPickerLabel}>Link task (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taskChips}>
                  <Pressable
                    style={[styles.chip, !t.selectedTaskId && styles.chipActive]}
                    onPress={() => t.setSelectedTaskId(null)}
                  >
                    <Text style={[styles.chipText, !t.selectedTaskId && styles.chipTextActive]}>None</Text>
                  </Pressable>
                  {openTasks.map((task) => (
                    <Pressable
                      key={task._id}
                      style={[styles.chip, t.selectedTaskId === task._id && styles.chipActive]}
                      onPress={() => t.setSelectedTaskId(task._id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          t.selectedTaskId === task._id && styles.chipTextActive,
                        ]}
                      >
                        {task.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {t.error ? (
              <Pressable onPress={t.clearError} style={styles.alert}>
                <Text style={styles.alertText}>{t.error}</Text>
                <Text style={styles.alertDismiss}>Tap to dismiss</Text>
              </Pressable>
            ) : null}

            <View style={styles.rowActions}>
              <View style={styles.primaryWrap}>
                <PrimaryButton
                  label={t.submitting ? 'Saving…' : primary}
                  onPress={t.toggle}
                  disabled={t.submitting}
                  loading={t.submitting}
                />
              </View>
              <SecondaryButton
                label="Reset"
                onPress={t.reset}
                disabled={t.submitting}
                style={styles.resetBtn}
              />
            </View>
            {t.phase === 'break' ? (
              <SecondaryButton
                label="Skip to focus"
                onPress={t.skipBreak}
                disabled={t.submitting}
                style={styles.skipBtn}
              />
            ) : null}
            {t.phase === 'break' && !t.autoStartSessions ? (
              <Text style={styles.tip}>Press Start Focus when you&apos;re ready.</Text>
            ) : null}
          </Card>
        </View>

        {xpLine ? (
          <Card style={styles.xpCard}>
            <Text style={styles.xpTitle}>Level {xpLine.level} progress</Text>
            <View style={styles.xpHead}>
              <Text style={styles.xpSub}>XP to next tier</Text>
              <Text style={styles.xpVal}>
                {xpLine.xp} / {xpLine.threshold}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${xpLine.pct}%` }]} />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createFocusStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 18, paddingTop: 8 },
    pageTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
      marginBottom: 14,
    },
    backdrop: {
      backgroundColor: c.focusBg,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: c.focusBgDeep,
      padding: 16,
      marginBottom: 16,
    },
    badge: {
      alignSelf: 'center',
      backgroundColor: c.focusBadgeBg,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.pill,
      marginBottom: 14,
    },
    badgeBreak: {
      backgroundColor: c.breakBadgeBg,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.focusBadgeText,
      letterSpacing: 0.3,
    },
    badgeTextBreak: {
      color: c.breakBadgeText,
    },
    timerCard: {
      alignItems: 'stretch',
      backgroundColor: c.surface,
    },
    label: {
      textAlign: 'center',
      fontSize: 15,
      fontWeight: '600',
      color: c.textMuted,
      marginBottom: 12,
    },
    timer: {
      textAlign: 'center',
      fontSize: 52,
      fontWeight: '700',
      color: c.text,
      marginBottom: 8,
    },
    hint: {
      textAlign: 'center',
      fontSize: 14,
      color: c.textSoft,
      marginBottom: 16,
      lineHeight: 20,
    },
    taskPicker: { marginBottom: 14 },
    taskPickerLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted, marginBottom: 8 },
    taskChips: { flexGrow: 0 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: c.miniBg,
      borderWidth: 1,
      borderColor: c.miniBorder,
      marginRight: 8,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    chipTextActive: { color: c.onPrimary },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    primaryWrap: {
      flex: 2,
      marginRight: 10,
      justifyContent: 'center',
    },
    resetBtn: {
      flex: 1,
      minWidth: 0,
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    skipBtn: { marginTop: 10 },
    tip: {
      marginTop: 12,
      fontSize: 13,
      color: c.textSoft,
      textAlign: 'center',
      lineHeight: 18,
    },
    alert: {
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: radii.sm,
      padding: 12,
      marginBottom: 14,
    },
    alertText: { color: c.errorText, fontSize: 14, textAlign: 'center' },
    alertDismiss: {
      color: c.textMuted,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 6,
    },
    xpCard: { marginBottom: 8 },
    xpTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
      marginBottom: 10,
    },
    xpHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    xpSub: { fontSize: 14, fontWeight: '600', color: c.textMuted },
    xpVal: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
    track: {
      height: 10,
      borderRadius: radii.pill,
      backgroundColor: c.track,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radii.pill,
      backgroundColor: c.primary,
    },
  });
