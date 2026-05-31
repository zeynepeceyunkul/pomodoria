import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii } from '../constants/theme';
import { Card } from '../components/Card';
import { SectionTitle } from '../components/SectionTitle';
import { useTabContentPadding } from '../hooks/useTabContentPadding';
import { formatMinutes } from '../lib/formatMinutes';
import { AuthHttpError } from '../services/http';
import {
  getSessionAnalytics,
  getSessionStats,
  type SessionAnalyticsResponse,
  type SessionStatsResponse,
} from '../services/sessions';
import { useAuth } from '../context/AuthContext';

export function StatisticsScreen() {
  const { signOut } = useAuth();
  const bottomPad = useTabContentPadding(24);
  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [analytics, setAnalytics] = useState<SessionAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, a] = await Promise.all([getSessionStats(), getSessionAnalytics()]);
      setStats(s);
      setAnalytics(a);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load statistics.');
      setStats(null);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const chartDays = useMemo(() => {
    const src = analytics?.last7Days?.length ? analytics.last7Days : analytics?.thisWeekDaily;
    if (!src?.length) return [];
    return src.map((d) => ({
      label: 'date' in d ? String(d.date).slice(5) : d.label,
      minutes: d.focusMinutes,
      sessions: 'completedSessions' in d ? d.completedSessions : 0,
    }));
  }, [analytics]);

  const maxMinutes = useMemo(() => Math.max(1, ...chartDays.map((d) => d.minutes)), [chartDays]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.pageTitle}>Statistics</Text>

        {loading ? <Text style={styles.muted}>Loading…</Text> : null}
        {error ? (
          <Card style={styles.errCard}>
            <Text style={styles.err}>{error}</Text>
          </Card>
        ) : null}

        {analytics ? (
          <Card style={styles.stackBelow}>
            <SectionTitle>Streaks</SectionTitle>
            <View style={styles.streakGrid}>
              <View style={styles.streakCell}>
                <Text style={styles.streakVal}>{analytics.currentStreak}</Text>
                <Text style={styles.streakLbl}>Current streak</Text>
              </View>
              <View style={styles.streakCell}>
                <Text style={styles.streakVal}>{analytics.longestStreak}</Text>
                <Text style={styles.streakLbl}>Longest streak</Text>
              </View>
            </View>
            {analytics.mostProductiveWeekday ? (
              <Text style={styles.weekdayHint}>
                Most productive weekday: <Text style={styles.weekdayEm}>{analytics.mostProductiveWeekday}</Text>
              </Text>
            ) : null}
          </Card>
        ) : null}

        {stats ? (
          <>
            <Card style={[styles.rowCard, styles.statCardSpacer]}>
              <Text style={styles.label}>Total sessions</Text>
              <Text style={styles.value}>{stats.totalSessions}</Text>
            </Card>
            <Card style={[styles.rowCard, styles.statCardSpacer]}>
              <Text style={styles.label}>Completed focus sessions</Text>
              <Text style={styles.value}>{stats.completedFocusSessions}</Text>
            </Card>
            <Card style={[styles.rowCard, styles.statCardSpacer]}>
              <Text style={styles.label}>Focus time</Text>
              <Text style={styles.value}>{formatMinutes(stats.totalFocusMinutes)}</Text>
            </Card>
            <Card style={[styles.rowCard, styles.statCardSpacer]}>
              <Text style={styles.label}>XP from sessions</Text>
              <Text style={styles.value}>{stats.totalXpEarned} XP</Text>
            </Card>
          </>
        ) : null}

        {chartDays.length ? (
          <Card>
            <SectionTitle>Recent focus (minutes)</SectionTitle>
            {chartDays.map((d, i) => (
              <View key={`${d.label}-${i}`} style={styles.barRow}>
                <Text style={styles.barLabel}>{d.label}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { width: `${Math.max(6, (d.minutes / maxMinutes) * 100)}%` }]}
                  />
                </View>
                <Text style={styles.barVal}>{d.minutes}m</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 18 },
  stackBelow: { marginBottom: 14 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  muted: { color: colors.textMuted, marginBottom: 8 },
  statCardSpacer: { marginBottom: 14 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 15, color: colors.textMuted, flex: 1 },
  value: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 12,
  },
  errCard: { borderWidth: 1, borderColor: colors.errorBorder, backgroundColor: colors.errorBg, marginBottom: 12 },
  err: { color: colors.errorText, fontSize: 14 },
  streakGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  streakCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  streakVal: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  streakLbl: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  weekdayHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  weekdayEm: { fontWeight: '700', color: colors.primary },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: {
    width: 52,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primaryMid,
  },
  barVal: {
    width: 44,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
