const mongoose = require('mongoose');
const Session = require('../models/Session');
const User = require('../models/User');
const { calculateXP, calculateLevel } = require('../utils/xpCalculator');
const {
  utcDayKey,
  currentStreakUtc,
  longestStreakUtc,
} = require('../utils/streakCalculator');

const SESSION_TYPES = ['focus', 'break'];

const formatValidationMessage = (error) => {
  if (error.name !== 'ValidationError' || !error.errors) {
    return error.message || 'Validation failed';
  }
  return Object.values(error.errors)
    .map((e) => e.message)
    .join('; ');
};

const parseRequiredDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return { ok: false, error: `${fieldName} is required` };
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: `${fieldName} must be a valid date` };
  }
  return { ok: true, date: d };
};

const parseOptionalDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, date: undefined };
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: 'endTime must be a valid date' };
  }
  return { ok: true, date: d };
};

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return Boolean(value);
};

const createSession = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const rawType = req.body.type;
    const type = typeof rawType === 'string' ? rawType.trim() : rawType;
    if (!SESSION_TYPES.includes(type)) {
      return res.status(400).json({
        message: 'Invalid session type. Must be focus or break',
      });
    }

    const startResult = parseRequiredDate(req.body.startTime, 'startTime');
    if (!startResult.ok) {
      return res.status(400).json({ message: startResult.error });
    }

    let endTime;
    if (req.body.endTime !== undefined && req.body.endTime !== null && req.body.endTime !== '') {
      const endResult = parseOptionalDate(req.body.endTime);
      if (!endResult.ok) {
        return res.status(400).json({ message: endResult.error });
      }
      endTime = endResult.date;
    }

    if (req.body.duration === undefined || req.body.duration === null) {
      return res.status(400).json({ message: 'duration is required' });
    }
    const durationNum = Number(req.body.duration);
    if (Number.isNaN(durationNum) || durationNum < 0) {
      return res.status(400).json({ message: 'duration must be a non-negative number' });
    }

    const completed = normalizeBoolean(req.body.completed, false);
    const xpEarned = calculateXP({ type, completed });

    const session = await Session.create({
      userId,
      type,
      duration: durationNum,
      startTime: startResult.date,
      endTime,
      completed,
      xpEarned,
    });

    if (type === 'focus' && completed) {
      const user = await User.findById(userId);
      if (user) {
        if (xpEarned > 0) {
          const newTotalXp = (user.xp || 0) + xpEarned;
          user.xp = newTotalXp;
          user.level = calculateLevel(newTotalXp);
        }
        const completedFocus = await Session.find({
          userId,
          type: 'focus',
          completed: true,
        })
          .select('startTime')
          .lean();
        user.streak = currentStreakUtc(completedFocus);
        await user.save();
      }
    }

    return res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: formatValidationMessage(error) });
    }
    return res.status(500).json({ message: 'Server error while creating session' });
  }
};

const getMySessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(sessions);
  } catch (error) {
    console.error('Get my sessions error:', error);
    return res.status(500).json({ message: 'Server error while fetching sessions' });
  }
};

const getSessionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await Session.find({ userId });

    const totalSessions = sessions.length;
    const completedFocusSessions = sessions.filter(
      (s) => s.type === 'focus' && s.completed
    ).length;
    const totalFocusMinutes = sessions
      .filter((s) => s.type === 'focus')
      .reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalXpEarned = sessions.reduce((sum, s) => sum + (s.xpEarned || 0), 0);

    return res.status(200).json({
      totalSessions,
      completedFocusSessions,
      totalFocusMinutes,
      totalXpEarned,
    });
  } catch (error) {
    console.error('Get session stats error:', error);
    return res.status(500).json({ message: 'Server error while fetching session stats' });
  }
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfUtcWeekMonday(reference = new Date()) {
  const d = new Date(reference);
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - diffToMonday);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addUtcDays(date, n) {
  const x = new Date(date);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

const getSessionAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, completedFocus] = await Promise.all([
      User.findById(userId).select('streak').lean(),
      Session.find({ userId, type: 'focus', completed: true }).lean(),
    ]);

    const last7Days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const daySessions = completedFocus.filter((s) => utcDayKey(s.startTime) === key);
      const focusMinutes = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      last7Days.push({
        date: key,
        focusMinutes,
        completedSessions: daySessions.length,
      });
    }

    const weekStart = startOfUtcWeekMonday(new Date());
    const weekEnd = addUtcDays(weekStart, 7);
    const thisWeekMinutes = [0, 0, 0, 0, 0, 0, 0];
    for (const s of completedFocus) {
      const t = new Date(s.startTime);
      if (t >= weekStart && t < weekEnd) {
        const dow = (t.getUTCDay() + 6) % 7;
        thisWeekMinutes[dow] += s.duration || 0;
      }
    }
    const thisWeekDaily = WEEKDAY_LABELS.map((label, i) => ({
      label,
      focusMinutes: thisWeekMinutes[i],
    }));

    const weekdayTotalsAllTime = [0, 0, 0, 0, 0, 0, 0];
    for (const s of completedFocus) {
      const dow = (new Date(s.startTime).getUTCDay() + 6) % 7;
      weekdayTotalsAllTime[dow] += s.duration || 0;
    }
    let maxIdx = 0;
    for (let i = 1; i < 7; i += 1) {
      if (weekdayTotalsAllTime[i] > weekdayTotalsAllTime[maxIdx]) maxIdx = i;
    }
    const mostProductiveWeekday =
      weekdayTotalsAllTime[maxIdx] > 0 ? WEEKDAY_LABELS[maxIdx] : null;

    const streakComputed = currentStreakUtc(completedFocus);
    const longestStreak = longestStreakUtc(completedFocus);

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayBucket = last7Days.find((x) => x.date === todayKey);
    const todayFocusMinutes = todayBucket ? todayBucket.focusMinutes : 0;

    return res.status(200).json({
      currentStreak: user?.streak ?? streakComputed,
      streakVerified: streakComputed,
      longestStreak,
      last7Days,
      thisWeekDaily,
      weekdayTotalsAllTime: WEEKDAY_LABELS.map((label, i) => ({
        label,
        focusMinutes: weekdayTotalsAllTime[i],
      })),
      mostProductiveWeekday,
      todayFocusMinutes,
      completedFocusSessions: completedFocus.length,
      totalFocusMinutes: completedFocus.reduce((sum, s) => sum + (s.duration || 0), 0),
    });
  } catch (error) {
    console.error('Get session analytics error:', error);
    return res.status(500).json({ message: 'Server error while fetching session analytics' });
  }
};

module.exports = {
  createSession,
  getMySessions,
  getSessionStats,
  getSessionAnalytics,
};
