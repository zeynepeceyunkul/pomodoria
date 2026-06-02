const ACHIEVEMENTS = [
  {
    id: 'first_session',
    title: 'First Session',
    description: 'Complete your first focus session',
    check: ({ stats }) => stats.completedFocusSessions >= 1,
  },
  {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day focus streak',
    check: ({ progress }) => progress.streak >= 7,
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Complete 100 focus sessions',
    check: ({ stats }) => stats.completedFocusSessions >= 100,
  },
  {
    id: 'focus_master',
    title: 'Focus Master',
    description: 'Complete 500 focus sessions',
    check: ({ stats }) => stats.completedFocusSessions >= 500,
  },
  {
    id: 'legendary_streak',
    title: 'Legendary Streak',
    description: 'Reach a 30-day focus streak',
    check: ({ progress }) => progress.streak >= 30,
  },
  {
    id: 'first_task',
    title: 'Task Starter',
    description: 'Complete your first task',
    check: ({ stats }) => (stats.completedTasks ?? 0) >= 1,
  },
  {
    id: 'task_master',
    title: 'Task Master',
    description: 'Complete 25 tasks',
    check: ({ stats }) => (stats.completedTasks ?? 0) >= 25,
  },
];

function evaluateAchievements(context, alreadyUnlockedIds = []) {
  const unlockedSet = new Set(alreadyUnlockedIds);
  const newlyUnlocked = [];

  for (const def of ACHIEVEMENTS) {
    if (unlockedSet.has(def.id)) continue;
    if (def.check(context)) {
      newlyUnlocked.push({
        id: def.id,
        title: def.title,
        description: def.description,
        unlockedAt: new Date(),
      });
      unlockedSet.add(def.id);
    }
  }

  return newlyUnlocked;
}

function listAchievementsForUser(unlockedEntries = [], context) {
  const unlockedMap = new Map(unlockedEntries.map((e) => [e.id, e]));

  return ACHIEVEMENTS.map((def) => {
    const stored = unlockedMap.get(def.id);
    const unlocked = Boolean(stored) || def.check(context);
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      unlocked,
      unlockedAt: stored?.unlockedAt ?? null,
    };
  });
}

module.exports = {
  ACHIEVEMENTS,
  evaluateAchievements,
  listAchievementsForUser,
};
