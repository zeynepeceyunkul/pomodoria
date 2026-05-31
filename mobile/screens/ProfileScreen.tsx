import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, radii } from '../constants/theme';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTabContentPadding } from '../hooks/useTabContentPadding';
import type { MainTabParamList } from '../navigation/types';
import { AuthHttpError } from '../services/http';
import { getSessionAnalytics, type SessionAnalyticsResponse } from '../services/sessions';
import { getProgress, type ProgressResponse } from '../services/users';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { user, signOut, refreshUser } = useAuth();
  const bottomPad = useTabContentPadding(24);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [analytics, setAnalytics] = useState<SessionAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    setError(null);
    let continueAfterProgress = true;
    try {
      const p = await getProgress();
      setProgress(p);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
        continueAfterProgress = false;
      } else {
        setError(e instanceof Error ? e.message : 'Could not load progress.');
        setProgress(null);
      }
    }
    if (!continueAfterProgress) {
      setLoading(false);
      return;
    }
    try {
      const a = await getSessionAnalytics();
      setAnalytics(a);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
      }
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshUser(), loadProgress()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, loadProgress]);

  const openSettings = () => {
    navigation.getParent()?.navigate('Settings');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.pageTitle, styles.stackBelow]}>Profile</Text>

        {user ? (
          <Card style={[styles.hero, styles.stackBelow]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>?</Text>
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </Card>
        ) : null}

        <Pressable style={[styles.settingsRow, styles.stackBelow]} onPress={openSettings}>
          <View style={styles.settingsLeft}>
            <View style={styles.settingsIconWrap}>
              <Ionicons name="settings-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.settingsLabel}>Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSoft} />
        </Pressable>

        {loading ? <Text style={styles.muted}>Loading progress…</Text> : null}
        {error ? <Text style={styles.err}>{error}</Text> : null}

        {progress ? (
          <Card style={styles.stackBelow}>
            <Text style={styles.cardTitle}>Progress</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Level</Text>
              <Text style={styles.statValue}>{progress.level}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>XP</Text>
              <Text style={styles.statValue}>{progress.xp}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>{progress.streak} days</Text>
            </View>
            <View style={[styles.statRow, styles.lastRow]}>
              <Text style={styles.statLabel}>XP to next level</Text>
              <Text style={styles.statValue}>{progress.xpToNextLevel}</Text>
            </View>
          </Card>
        ) : null}

        {analytics ? (
          <Card style={styles.stackBelow}>
            <Text style={styles.cardTitle}>Session highlights</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Longest streak</Text>
              <Text style={styles.statValue}>{analytics.longestStreak} days</Text>
            </View>
            <View style={[styles.statRow, styles.lastRow]}>
              <Text style={styles.statLabel}>Focus logged (all time)</Text>
              <Text style={styles.statValue}>{analytics.totalFocusMinutes} min</Text>
            </View>
          </Card>
        ) : null}

        <PrimaryButton label="Sign out" onPress={() => void signOut()} style={styles.signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 18, paddingBottom: 32 },
  stackBelow: { marginBottom: 14 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  hero: { alignItems: 'center' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '600' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  email: { marginTop: 4, fontSize: 14, color: colors.textSoft },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.miniBorder,
  },
  settingsLeft: { flexDirection: 'row', alignItems: 'center' },
  settingsIconWrap: { marginRight: 12 },
  settingsLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.miniBorder,
  },
  lastRow: { borderBottomWidth: 0 },
  statLabel: { fontSize: 15, color: colors.textMuted },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { color: colors.textMuted },
  err: { color: colors.errorText },
  signOut: { marginTop: 8, backgroundColor: colors.textSecondary },
});
