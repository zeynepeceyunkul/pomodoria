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
import { radii } from '../constants/theme';
import { AIInsightCard } from '../components/AIInsightCard';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionTitle } from '../components/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { useFocusTimer } from '../context/FocusTimerContext';
import { useTabContentPadding } from '../hooks/useTabContentPadding';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { ThemeColors } from '../hooks/useThemeColors';
import { formatMinutes } from '../lib/formatMinutes';
import { aggregateSessionRanges } from '../lib/sessionAggregate';
import { buildCharacterState } from '../lib/characterEvolution';
import { xpIntoCurrentLevel, xpThresholdForCurrentTier, XP_PER_LEVEL } from '../lib/xpDisplay';
import type { MainTabParamList } from '../navigation/types';
import { AuthHttpError } from '../services/http';
import {
  getMySessions,
  getSessionStats,
  type SessionRecord,
  type SessionStatsResponse,
} from '../services/sessions';
import { getMyTasks, type TaskRecord } from '../services/tasks';

function formatClock(totalSec: number): string {
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function HomeScreen() {
  const styles = useThemedStyles(createHomeStyles);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const bottomPad = useTabContentPadding(24);
  const { user, refreshUser, signOut } = useAuth();
  const { remainingSec, isRunning, focusMinutes, phase, toggle } = useFocusTimer();
  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [todayTasks, setTodayTasks] = useState<TaskRecord[]>([]);
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
      const [list, tasks] = await Promise.all([getMySessions(), getMyTasks({ today: true })]);
      setSessions(Array.isArray(list) ? list : []);
      setTodayTasks(tasks.filter((t) => t.status !== 'completed').slice(0, 4));
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

  const character = user.character ?? buildCharacterState(user.level ?? 1);

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
          <CharacterAvatar character={character} size="md" />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.levelLine}>Level {user.level}</Text>
        </Card>

        <Card style={styles.stackBelow}>
          <SectionTitle>Today&apos;s tasks</SectionTitle>
          {todayTasks.length === 0 ? (
            <Text style={styles.muted}>No open tasks for today.</Text>
          ) : (
            todayTasks.map((task) => (
              <View key={task._id} style={styles.taskRow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskPriority}>{task.priority}</Text>
              </View>
            ))
          )}
          <Pressable onPress={() => navigation.navigate('Tasks')} style={styles.linkRow}>
            <Text style={styles.linkText}>Manage tasks</Text>
          </Pressable>
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
            {phase === 'focus' ? 'Focus' : 'Break'} · {focusMinutes} min blocks ·{' '}
            {isRunning ? 'In progress' : 'Ready when you are'}
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

const createHomeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 18 },
    stackBelow: { marginBottom: 16 },
    pageTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
      marginTop: 4,
    },
    timerCard: {
      borderWidth: 1,
      borderColor: c.focusBgDeep,
      backgroundColor: c.focusBg,
    },
    timerBig: {
      fontSize: 40,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    timerMeta: {
      textAlign: 'center',
      fontSize: 14,
      color: c.textSoft,
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
      color: c.link,
    },
    taskRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.miniBorder,
    },
    taskTitle: { flex: 1, fontSize: 15, color: c.text, marginRight: 8 },
    taskPriority: { fontSize: 12, fontWeight: '600', color: c.textMuted, textTransform: 'capitalize' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryCard: { flex: 1, minWidth: 0, paddingVertical: 4 },
    summaryCardSpacing: { marginRight: 10 },
    summaryLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textMuted,
      marginBottom: 6,
    },
    summaryValue: { fontSize: 22, fontWeight: '800', color: c.text },
    summarySub: { marginTop: 4, fontSize: 13, color: c.textSoft },
    profileCard: { alignItems: 'center' },
    name: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 6 },
    levelLine: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 4 },
    sub: { fontSize: 15, color: c.textSoft, display: 'none' as const },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressLeft: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
    progressRight: { fontSize: 15, fontWeight: '600', color: c.textMuted },
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
    streakRow: {
      marginTop: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    streakMain: { fontSize: 15, fontWeight: '700', color: c.textSecondary },
    streakSub: { marginTop: 2, fontSize: 13, color: c.textSoft },
    muted: { color: c.textMuted, textAlign: 'center', marginTop: 24 },
    err: { color: c.errorText, fontSize: 14 },
  });
