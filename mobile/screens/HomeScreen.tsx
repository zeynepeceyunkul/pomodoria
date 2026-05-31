import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors, radii } from '../constants/theme';
import { AIInsightCard } from '../components/AIInsightCard';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionTitle } from '../components/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { useFocusTimer } from '../context/FocusTimerContext';
import { useTabContentPadding } from '../hooks/useTabContentPadding';
import { formatMinutes } from '../lib/formatMinutes';
import { aggregateSessionRanges } from '../lib/sessionAggregate';
import { xpIntoCurrentLevel, xpThresholdForCurrentTier, XP_PER_LEVEL } from '../lib/xpDisplay';
import type { MainTabParamList } from '../navigation/types';
import { AuthHttpError } from '../services/http';
import {
  getMySessions,
  getSessionStats,
  type SessionRecord,
  type SessionStatsResponse,
} from '../services/sessions';

function formatClock(totalSec: number): string {
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const bottomPad = useTabContentPadding(24);
  const { user, refreshUser, signOut } = useAuth();
  const { remainingSec, isRunning, focusMinutes, toggle } = useFocusTimer();
  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statsErr, setStatsErr] = useState<string | null>(null);

  const agg = useMemo(() => aggregateSessionRanges(sessions), [sessions]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsErr(null);
    try {
      const s = await getSessionStats();
      setStats(s);
    } catch (e) {
      setStatsErr(e instanceof Error ? e.message : 'Could not load stats.');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const list = await getMySessions();
      setSessions(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
        return;
      }
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [signOut]);

  useEffect(() => {
    void loadStats();
    void loadSessions();
  }, [loadStats, loadSessions]);

  useFocusEffect(
    useCallback(() => {
      void refreshUser();
      void loadSessions();
    }, [refreshUser, loadSessions]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshUser(), loadStats(), loadSessions()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, loadStats, loadSessions]);

  const xpProgress = useMemo(() => {
    if (!user) return { pct: 0, nextLevel: 2, threshold: XP_PER_LEVEL, into: 0 };
    const xp = user.xp ?? 0;
    const lvl = user.level ?? 1;
    const into = xpIntoCurrentLevel(xp);
    const threshold = xpThresholdForCurrentTier(xp);
    const pct = Math.min(100, Math.round((into / XP_PER_LEVEL) * 100));
    return { pct, nextLevel: lvl + 1, threshold, into };
  }, [user]);

  const totalSec = Math.max(1, focusMinutes) * 60;
  const timerPrimary = isRunning
    ? 'Pause'
    : remainingSec <= 0 || remainingSec === totalSec
      ? 'Start'
      : 'Resume';

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.pageTitle, styles.stackBelow]}>Dashboard</Text>

        <Card style={[styles.profileCard, styles.stackBelow]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>?</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.levelLine}>Level {user.level} Warrior</Text>
          <Text style={styles.sub}>Keep grinding!</Text>
        </Card>

        <View style={[styles.summaryRow, styles.stackBelow]}>
          <Card style={[styles.summaryCard, styles.summaryCardSpacing]}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryValue}>{agg.todaySessions}</Text>
            <Text style={styles.summarySub}>{formatMinutes(agg.todayMinutes)} focus</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This week</Text>
            <Text style={styles.summaryValue}>{agg.weekSessions}</Text>
            <Text style={styles.summarySub}>{formatMinutes(agg.weekMinutes)} focus</Text>
          </Card>
        </View>

        <Card style={[styles.timerCard, styles.stackBelow]}>
          <SectionTitle>Focus timer</SectionTitle>
          <Text style={styles.timerBig}>{formatClock(remainingSec)}</Text>
          <Text style={styles.timerMeta}>
            {focusMinutes} minute blocks · {isRunning ? 'In progress' : 'Ready when you are'}
          </Text>
          <PrimaryButton label={timerPrimary} onPress={toggle} style={styles.timerBtn} />
          <Pressable onPress={() => navigation.navigate('Focus')} style={styles.linkRow}>
            <Text style={styles.linkText}>Open Focus workspace</Text>
          </Pressable>
        </Card>

        <Card style={styles.stackBelow}>
          <SectionTitle>Your progress</SectionTitle>
          <View style={styles.progressHead}>
            <Text style={styles.progressLeft}>XP to Level {xpProgress.nextLevel}</Text>
            <Text style={styles.progressRight}>
              {user.xp ?? 0} / {xpProgress.threshold}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${xpProgress.pct}%` }]} />
          </View>
          <View style={styles.streakRow}>
            <View>
              <Text style={styles.streakMain}>{user.streak} day streak</Text>
              <Text style={styles.streakSub}>Keep it going!</Text>
            </View>
          </View>
        </Card>

        <Card>
          <SectionTitle>AI suggestions</SectionTitle>
          <AIInsightCard message="You are more productive in the evening — try scheduling deep work after 5pm." />
          <AIInsightCard message="Short bursts beat long cram sessions. Your focus blocks match peak attention spans." />
          {stats ? (
            <AIInsightCard
              title="Based on your history"
              message={`Lifetime: ${stats.completedFocusSessions} completed focus sessions and ${formatMinutes(stats.totalFocusMinutes)} logged. ${stats.totalXpEarned} XP earned from sessions.`}
            />
          ) : loadingStats || loadingSessions ? (
            <Text style={styles.muted}>Loading insights…</Text>
          ) : statsErr ? (
            <Text style={styles.err}>{statsErr}</Text>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 18,
  },
  stackBelow: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  timerCard: {
    borderWidth: 1,
    borderColor: colors.focusBgDeep,
    backgroundColor: colors.focusBg,
  },
  timerBig: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  timerMeta: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSoft,
    marginBottom: 16,
  },
  timerBtn: { marginBottom: 10 },
  linkRow: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
  },
  summaryCardSpacing: {
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  summarySub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSoft,
  },
  profileCard: {
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  levelLine: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  sub: {
    fontSize: 15,
    color: colors.textSoft,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLeft: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressRight: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
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
  streakRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakMain: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  streakSub: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSoft,
  },
  muted: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  err: {
    color: colors.errorText,
    fontSize: 14,
  },
});
