/** Matches backend `xpCalculator`: 200 XP per level tier (same as web). */
export const XP_PER_LEVEL = 200;

export function levelFromXp(totalXp: number): number {
  const xp = typeof totalXp === 'number' && !Number.isNaN(totalXp) ? Math.max(0, totalXp) : 0;
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpIntoCurrentLevel(totalXp: number): number {
  const xp = typeof totalXp === 'number' && !Number.isNaN(totalXp) ? Math.max(0, totalXp) : 0;
  const lvl = levelFromXp(xp);
  return xp - (lvl - 1) * XP_PER_LEVEL;
}

export function xpThresholdForCurrentTier(totalXp: number): number {
  const xp = typeof totalXp === 'number' && !Number.isNaN(totalXp) ? Math.max(0, totalXp) : 0;
  const lvl = levelFromXp(xp);
  return lvl * XP_PER_LEVEL;
}
