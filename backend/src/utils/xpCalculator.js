// Rules:
// - completed focus session → +50 XP
// - completed task → +30 XP
// - streak bonus on focus → up to +50 XP (5 XP per streak day after day 1)
// - level-up bonus → +25 XP per level gained
// - every 200 XP → +1 level (level 1 at 0–199 XP)

const FOCUS_SESSION_XP = 50;
const TASK_COMPLETION_XP = 30;
const XP_PER_LEVEL = 200;
const STREAK_XP_PER_DAY = 5;
const STREAK_XP_CAP = 50;
const LEVEL_UP_BONUS_XP = 25;

/**
 * XP earned for a single session (completed focus only).
 */
function calculateXP({ type, completed }) {
  if (type === 'focus' && completed) {
    return FOCUS_SESSION_XP;
  }
  return 0;
}

function calculateTaskXP() {
  return TASK_COMPLETION_XP;
}

/** Bonus XP for maintaining a multi-day focus streak (applied on focus completion). */
function calculateStreakBonus(streakDays) {
  const streak = typeof streakDays === 'number' && streakDays > 1 ? streakDays : 0;
  if (streak <= 1) return 0;
  return Math.min((streak - 1) * STREAK_XP_PER_DAY, STREAK_XP_CAP);
}

/** One-time bonus when crossing level thresholds. */
function calculateLevelUpBonus(oldLevel, newLevel) {
  const prev = typeof oldLevel === 'number' ? oldLevel : 1;
  const next = typeof newLevel === 'number' ? newLevel : prev;
  if (next <= prev) return 0;
  return (next - prev) * LEVEL_UP_BONUS_XP;
}

/**
 * Total XP for a completed focus session including streak bonus.
 */
function calculateFocusSessionXp(streakDays) {
  return FOCUS_SESSION_XP + calculateStreakBonus(streakDays);
}

/**
 * Level from total lifetime XP (floor(xp / 200) + 1).
 */
function calculateLevel(totalXp) {
  const xp = typeof totalXp === 'number' && !Number.isNaN(totalXp) ? totalXp : 0;
  if (xp < 0) return 1;
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/**
 * XP still needed to reach the next level threshold.
 */
function xpToNextLevel(totalXp) {
  const xp = typeof totalXp === 'number' && !Number.isNaN(totalXp) ? totalXp : 0;
  if (xp < 0) return XP_PER_LEVEL;
  const level = calculateLevel(xp);
  const thresholdForNextLevel = level * XP_PER_LEVEL;
  const remaining = thresholdForNextLevel - xp;
  return remaining < 0 ? 0 : remaining;
}

module.exports = {
  FOCUS_SESSION_XP,
  TASK_COMPLETION_XP,
  XP_PER_LEVEL,
  STREAK_XP_PER_DAY,
  STREAK_XP_CAP,
  LEVEL_UP_BONUS_XP,
  calculateXP,
  calculateTaskXP,
  calculateStreakBonus,
  calculateLevelUpBonus,
  calculateFocusSessionXp,
  calculateLevel,
  xpToNextLevel,
};
