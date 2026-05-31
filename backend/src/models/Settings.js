const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    focusDuration: {
      type: Number,
      default: 25,
      min: 1,
    },
    breakDuration: {
      type: Number,
      default: 5,
      min: 1,
    },
    theme: {
      type: String,
      default: 'light',
    },
    longBreakDuration: {
      type: Number,
      default: 15,
      min: 1,
    },
    sessionsUntilLongBreak: {
      type: Number,
      default: 4,
      min: 2,
      max: 10,
    },
    notifySessionReminders: {
      type: Boolean,
      default: true,
    },
    notifyBreakReminders: {
      type: Boolean,
      default: true,
    },
    notifyAchievements: {
      type: Boolean,
      default: true,
    },
    soundEffects: {
      type: Boolean,
      default: false,
    },
    /** When true, focus → break → focus cycles automatically until long break. */
    autoStartSessions: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
