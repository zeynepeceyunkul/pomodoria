import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii } from '../constants/theme';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { useFocusTimer } from '../context/FocusTimerContext';
import { useAuth } from '../context/AuthContext';
import { useTabContentPadding } from '../hooks/useTabContentPadding';
import { xpIntoCurrentLevel, xpThresholdForCurrentTier, XP_PER_LEVEL } from '../lib/xpDisplay';

function formatClock(totalSec: number): string {
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function FocusScreen() {
  const { user } = useAuth();
  const bottomPad = useTabContentPadding(24);
  const {
    focusMinutes,
    remainingSec,
    isRunning,
    submitting,
    error,
    toggle,
    reset,
    clearError,
  } = useFocusTimer();

  const totalSec = Math.max(1, focusMinutes) * 60;
  const primary = isRunning
    ? 'Pause'
    : remainingSec <= 0 || remainingSec === totalSec
      ? 'Start'
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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Focus mode</Text>
          </View>

          <Card style={styles.timerCard}>
            <Text style={styles.label}>Focus session</Text>
            <Text style={styles.timer}>{formatClock(remainingSec)}</Text>
            <Text style={styles.hint}>
              Pomodoria rhythm · {focusMinutes} min blocks · tap Start when you are ready
            </Text>

            {error ? (
              <Pressable onPress={clearError} style={styles.alert}>
                <Text style={styles.alertText}>{error}</Text>
                <Text style={styles.alertDismiss}>Tap to dismiss</Text>
              </Pressable>
            ) : null}

            <View style={styles.rowActions}>
              <View style={styles.primaryWrap}>
                <PrimaryButton
                  label={submitting ? 'Saving…' : primary}
                  onPress={toggle}
                  disabled={submitting}
                  loading={submitting}
                />
              </View>
              <SecondaryButton
                label="Reset"
                onPress={reset}
                disabled={submitting}
                style={styles.resetBtn}
              />
            </View>
            <Text style={styles.tip}>Reset clears the round without saving. Pause keeps your place.</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  backdrop: {
    backgroundColor: colors.focusBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.focusBgDeep,
    padding: 16,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: colors.focusBadgeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.focusBadgeText,
    letterSpacing: 0.3,
  },
  timerCard: {
    alignItems: 'stretch',
    backgroundColor: colors.surface,
  },
  label: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
  },
  timer: {
    textAlign: 'center',
    fontSize: 52,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  hint: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSoft,
    marginBottom: 22,
    lineHeight: 20,
  },
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
  tip: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 18,
  },
  alert: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 14,
  },
  alertText: { color: colors.errorText, fontSize: 14, textAlign: 'center' },
  alertDismiss: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  xpCard: { marginBottom: 8 },
  xpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  xpHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpSub: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  xpVal: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  track: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primaryMid,
  },
});
