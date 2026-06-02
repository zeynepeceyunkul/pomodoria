const mongoose = require('mongoose');
const { buildCharacterState } = require('../utils/characterEvolution');

const unlockedAchievementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    unlockedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    avatar: {
      type: String,
      trim: true,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    refreshTokenHash: {
      type: String,
      default: null,
    },
    refreshTokenExpires: {
      type: Date,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    characterStage: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    unlockedAchievements: {
      type: [unlockedAchievementSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('save', function syncCharacterStage() {
  if (this.isModified('level') || this.isNew) {
    this.characterStage = buildCharacterState(this.level).stage;
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
