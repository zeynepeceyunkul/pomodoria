import { tryDesktopNotify } from '../lib/timerFx';
import type { CreateSessionResponse } from '../api/sessions';

export function notifyGamificationResult(
  gamification: CreateSessionResponse['gamification'],
  prefs: { notifyAchievements: boolean },
): void {
  if (!gamification || !prefs.notifyAchievements) return;

  const unlocked = gamification.newlyUnlockedAchievements ?? [];
  for (const a of unlocked) {
    tryDesktopNotify('Achievement unlocked!', a.title);
  }

  const xp = gamification.xpBreakdown;
  if (xp && xp.total > 0 && unlocked.length === 0) {
    const parts = [`+${xp.base} XP`];
    if (xp.streakBonus > 0) parts.push(`+${xp.streakBonus} streak`);
    if (xp.levelUpBonus > 0) parts.push(`+${xp.levelUpBonus} level-up`);
    tryDesktopNotify('Progress saved', parts.join(', '));
  }
}
