import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { radii } from '../constants/theme';
import { Card } from '../components/Card';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { buildCharacterState } from '../lib/characterEvolution';
import { useTabContentPadding } from '../hooks/useTabContentPadding';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useThemeColors, type ThemeColors } from '../hooks/useThemeColors';
import type { MainTabParamList } from '../navigation/types';
import { AuthHttpError } from '../services/http';
import { getSessionAnalytics, type SessionAnalyticsResponse } from '../services/sessions';
import { getProgress, getAchievements, type AchievementItem, type ProgressResponse } from '../services/users';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const styles = useThemedStyles(createProfileStyles);
  const c = useThemeColors();
  const { user, signOut, refreshUser } = useAuth();
  const bottomPad = useTabContentPadding(24);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [analytics, setAnalytics] = useState<SessionAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    setError(null);
    let continueAfterProgress = true;
    try {
      const [p, a] = await Promise.all([getProgress(), getAchievements()]);
      setProgress(p);
      setAchievements(a.achievements);
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

        {user && progress ? (
          <>
            <Card style={[styles.hero, styles.stackBelow]}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.userPhoto} />
              ) : null}
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </Card>

            <Card style={[styles.hero, styles.stackBelow]}>
              <CharacterAvatar
                character={progress.character ?? buildCharacterState(progress.level)}
                size="lg"
              />
              <Text style={styles.level}>Level {progress.level}</Text>
            </Card>
          </>
        ) : user ? (
          <Card style={[styles.hero, styles.stackBelow]}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.userPhoto} />
            ) : null}
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </Card>
        ) : null}

        <Pressable style={[styles.settingsRow, styles.stackBelow]} onPress={openSettings}>
          <View style={styles.settingsLeft}>
            <View style={styles.settingsIconWrap}>
              <Ionicons name="settings-outline" size={22} color={c.text} />
            </View>
            <Text style={styles.settingsLabel}>Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.textSoft} />
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

        {achievements.length > 0 ? (
          <Card style={styles.stackBelow}>
            <Text style={styles.cardTitle}>Achievements</Text>
            {achievements.map((a) => (
              <View key={a.id} style={styles.achRow}>
                <View style={styles.achBody}>
                  <Text style={styles.achTitle}>{a.title}</Text>
                  <Text style={styles.achDesc}>{a.description}</Text>
                </View>
                <Text style={a.unlocked ? styles.unlocked : styles.locked}>
                  {a.unlocked ? 'Unlocked' : 'Locked'}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        <PrimaryButton label="Sign out" onPress={() => void signOut()} style={styles.signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createProfileStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 18, paddingBottom: 32 },
    stackBelow: { marginBottom: 14 },
    pageTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
      marginTop: 4,
    },
    hero: { alignItems: 'center' },
    userPhoto: {
      width: 88,
      height: 88,
      borderRadius: 44,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: c.border,
    },
    name: { fontSize: 18, fontWeight: '700', color: c.text },
    email: { marginTop: 4, fontSize: 14, color: c.textSoft },
    level: { marginTop: 10, fontSize: 18, fontWeight: '700', color: c.text },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: radii.card,
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: c.miniBorder,
    },
    settingsLeft: { flexDirection: 'row', alignItems: 'center' },
    settingsIconWrap: { marginRight: 12 },
    settingsLabel: { fontSize: 16, fontWeight: '600', color: c.text },
    cardTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.text,
      marginBottom: 12,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.miniBorder,
    },
    lastRow: { borderBottomWidth: 0 },
    statLabel: { fontSize: 15, color: c.textMuted },
    statValue: { fontSize: 15, fontWeight: '700', color: c.text },
    muted: { color: c.textMuted },
    err: { color: c.errorText },
    achRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.miniBorder,
    },
    achBody: { flex: 1 },
    achTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    achDesc: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    unlocked: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    locked: { fontSize: 12, fontWeight: '600', color: c.textSoft },
    signOut: { marginTop: 8, backgroundColor: c.textSecondary },
  });
