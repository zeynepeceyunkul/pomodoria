const Session = require('../models/Session');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { xpToNextLevel } = require('../utils/xpCalculator');
const { currentStreakUtc } = require('../utils/streakCalculator');

const getMe = async (req, res) => {
  try {
    const userDoc = await User.findById(req.user.id).select('-password');
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }

    const completedFocus = await Session.find({
      userId: req.user.id,
      type: 'focus',
      completed: true,
    })
      .select('startTime')
      .lean();
    const streak = currentStreakUtc(completedFocus);
    if ((userDoc.streak ?? 0) !== streak) {
      userDoc.streak = streak;
      await userDoc.save();
    }

    let settings = await Settings.findOne({ userId: req.user.id }).lean();
    if (!settings) {
      const created = await Settings.create({ userId: req.user.id });
      settings = created.toObject();
    }

    const user = userDoc.toObject();

    return res.status(200).json({
      ...user,
      settings: {
        focusDuration: settings.focusDuration ?? 25,
        breakDuration: settings.breakDuration ?? 5,
        theme: settings.theme || 'light',
        longBreakDuration: settings.longBreakDuration ?? 15,
        sessionsUntilLongBreak: settings.sessionsUntilLongBreak ?? 4,
        notifySessionReminders: settings.notifySessionReminders !== false,
        notifyBreakReminders: settings.notifyBreakReminders !== false,
        notifyAchievements: settings.notifyAchievements !== false,
        soundEffects: settings.soundEffects === true,
        autoStartSessions: settings.autoStartSessions !== false,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

const getProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const xp = user.xp || 0;

    const completedFocus = await Session.find({
      userId: req.user.id,
      type: 'focus',
      completed: true,
    })
      .select('startTime')
      .lean();
    const streak = currentStreakUtc(completedFocus);
    if ((user.streak ?? 0) !== streak) {
      user.streak = streak;
      await user.save();
    }

    return res.status(200).json({
      xp,
      level: user.level,
      streak,
      xpToNextLevel: xpToNextLevel(xp),
    });
  } catch (error) {
    console.error('Get progress error:', error);
    return res.status(500).json({ message: 'Server error while fetching progress' });
  }
};

const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = await Settings.create({ userId: req.user.id });
    }
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ message: 'Server error while fetching settings' });
  }
};

const normalizeBool = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return Boolean(value);
};

const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      focusDuration,
      breakDuration,
      theme,
      longBreakDuration,
      sessionsUntilLongBreak,
      notifySessionReminders,
      notifyBreakReminders,
      notifyAchievements,
      soundEffects,
      autoStartSessions,
    } = req.body;

    const updates = {};

    if (focusDuration !== undefined && focusDuration !== null) {
      const n = Number(focusDuration);
      if (!Number.isFinite(n) || n < 1) {
        return res.status(400).json({ message: 'focusDuration must be at least 1' });
      }
      updates.focusDuration = n;
    }

    if (breakDuration !== undefined && breakDuration !== null) {
      const n = Number(breakDuration);
      if (!Number.isFinite(n) || n < 1) {
        return res.status(400).json({ message: 'breakDuration must be at least 1' });
      }
      updates.breakDuration = n;
    }

    if (longBreakDuration !== undefined && longBreakDuration !== null) {
      const n = Number(longBreakDuration);
      if (!Number.isFinite(n) || n < 1) {
        return res.status(400).json({ message: 'longBreakDuration must be at least 1' });
      }
      updates.longBreakDuration = n;
    }

    if (sessionsUntilLongBreak !== undefined && sessionsUntilLongBreak !== null) {
      const n = Number(sessionsUntilLongBreak);
      if (!Number.isFinite(n) || n < 2 || n > 10) {
        return res
          .status(400)
          .json({ message: 'sessionsUntilLongBreak must be between 2 and 10' });
      }
      updates.sessionsUntilLongBreak = n;
    }

    if (theme !== undefined && theme !== null) {
      if (typeof theme !== 'string') {
        return res.status(400).json({ message: 'theme must be a string' });
      }
      updates.theme = theme.trim() || 'light';
    }

    if (notifySessionReminders !== undefined && notifySessionReminders !== null) {
      updates.notifySessionReminders = normalizeBool(notifySessionReminders, true);
    }
    if (notifyBreakReminders !== undefined && notifyBreakReminders !== null) {
      updates.notifyBreakReminders = normalizeBool(notifyBreakReminders, true);
    }
    if (notifyAchievements !== undefined && notifyAchievements !== null) {
      updates.notifyAchievements = normalizeBool(notifyAchievements, true);
    }
    if (soundEffects !== undefined && soundEffects !== null) {
      updates.soundEffects = normalizeBool(soundEffects, false);
    }
    if (autoStartSessions !== undefined && autoStartSessions !== null) {
      updates.autoStartSessions = normalizeBool(autoStartSessions, true);
    }

    let settings = await Settings.findOne({ userId });
    if (!settings) {
      settings = await Settings.create({ userId });
    }

    if (Object.keys(updates).length > 0) {
      Object.assign(settings, updates);
      await settings.save();
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ message: 'Server error while updating settings' });
  }
};

module.exports = {
  getMe,
  getProgress,
  getSettings,
  updateSettings,
};
