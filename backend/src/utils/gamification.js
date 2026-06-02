const Session = require('../models/Session');
const Task = require('../models/Task');
const { calculateLevel } = require('./xpCalculator');
const { currentStreakUtc } = require('./streakCalculator');
const { buildCharacterState } = require('./characterEvolution');
const { evaluateAchievements } = require('./achievements');

async function recomputeUserStreak(userId) {
  const completedFocus = await Session.find({
    userId,
    type: 'focus',
    completed: true,
  })
    .select('startTime')
    .lean();
  return currentStreakUtc(completedFocus);
}

async function buildGamificationContext(userId, user) {
  const [sessions, completedTasks] = await Promise.all([
    Session.find({ userId }).lean(),
    Task.countDocuments({ userId, status: 'completed' }),
  ]);

  const completedFocusSessions = sessions.filter(
    (s) => s.type === 'focus' && s.completed,
  ).length;

  const streak = user?.streak ?? (await recomputeUserStreak(userId));

  return {
    progress: {
      xp: user?.xp ?? 0,
      level: user?.level ?? 1,
      streak,
    },
    stats: {
      completedFocusSessions,
      completedTasks,
      totalSessions: sessions.length,
    },
  };
}

/**
 * Apply XP delta, recalculate level/character, streak, and unlock achievements.
 */
async function applyXpAndGamification(user, xpDelta) {
  if (xpDelta > 0) {
    const newTotalXp = (user.xp || 0) + xpDelta;
    user.xp = newTotalXp;
    user.level = calculateLevel(newTotalXp);
    user.characterStage = buildCharacterState(user.level).stage;
  }

  user.streak = await recomputeUserStreak(user._id);

  const context = await buildGamificationContext(user._id, user);
  const existingIds = (user.unlockedAchievements || []).map((a) => a.id);
  const newlyUnlocked = evaluateAchievements(context, existingIds);

  if (newlyUnlocked.length > 0) {
    user.unlockedAchievements = [...(user.unlockedAchievements || []), ...newlyUnlocked];
  }

  await user.save();

  return {
    newlyUnlockedAchievements: newlyUnlocked,
    character: buildCharacterState(user.level),
  };
}

module.exports = {
  recomputeUserStreak,
  buildGamificationContext,
  applyXpAndGamification,
};
