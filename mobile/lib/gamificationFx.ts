import { Alert } from 'react-native';
import type { CreateSessionResponse } from '../services/sessions';
import { sendLocalNotification } from './notifications';

type NotifyPrefs = {
  notifyAchievements?: boolean;
};

export function notifyGamificationResult(
  gamification: CreateSessionResponse['gamification'],
  prefs?: NotifyPrefs,
): void {
  if (!gamification) return;

  const unlocked = gamification.newlyUnlockedAchievements ?? [];
  const useNotify = prefs?.notifyAchievements !== false;

  for (const a of unlocked) {
    if (useNotify) {
      void sendLocalNotification('Achievement unlocked!', a.title);
    } else {
      Alert.alert('Achievement unlocked!', a.title);
    }
  }

  const xp = gamification.xpBreakdown;
  if (xp && xp.total > 0 && unlocked.length === 0) {
    const parts = [`+${xp.base} XP`];
    if (xp.streakBonus > 0) parts.push(`+${xp.streakBonus} streak`);
    if (xp.levelUpBonus > 0) parts.push(`+${xp.levelUpBonus} level-up`);
    Alert.alert('Session saved', parts.join(', '));
  }
}
