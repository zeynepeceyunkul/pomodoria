// Rules: completed focus session → +50 XP; every 200 XP → +1 level (level 1 at 0–199 XP)

const FOCUS_SESSION_XP = 50;
const XP_PER_LEVEL = 200;

/**
 * XP earned for a single session (completed focus only).
 */
function calculateXP({ type, completed }) {
  if (type === 'focus' && completed) {
    return FOCUS_SESSION_XP;
  }
  return 0;
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
  XP_PER_LEVEL,
  calculateXP,
  calculateLevel,
  xpToNextLevel,
};
