import { authGetJson, authPatchJson, authPutJson } from './http';
import type { CharacterState } from '../lib/characterEvolution';

/** Embedded on GET /api/users/me */
export type UserSettingsEmbedded = {
  focusDuration: number;
  breakDuration: number;
  theme: string;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  notifySessionReminders: boolean;
  notifyBreakReminders: boolean;
  notifyAchievements: boolean;
  soundEffects: boolean;
  autoStartSessions: boolean;
};

export type MeResponse = {
  _id: string;
  name: string;
  email: string;
  avatar?: string | null;
  level: number;
  xp: number;
  streak: number;
  characterStage?: number;
  createdAt?: string;
  updatedAt?: string;
  settings?: UserSettingsEmbedded;
  character?: CharacterState;
};

/** Matches GET /api/users/progress — `xpToNextLevel` is XP still needed for the next level. */
export type ProgressResponse = {
  xp: number;
  level: number;
  streak: number;
  xpToNextLevel: number;
  character?: CharacterState;
};

export type AchievementItem = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string | null;
};

export type UpdateProfileBody = {
  name?: string;
  avatar?: string | null;
};

export function getMe(): Promise<MeResponse> {
  return authGetJson<MeResponse>('/api/users/me');
}

export function getProgress(): Promise<ProgressResponse> {
  return authGetJson<ProgressResponse>('/api/users/progress');
}

export type SettingsResponse = {
  _id: string;
  userId: string;
  focusDuration: number;
  breakDuration: number;
  theme: string;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  notifySessionReminders: boolean;
  notifyBreakReminders: boolean;
  notifyAchievements: boolean;
  soundEffects: boolean;
  autoStartSessions: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateSettingsBody = {
  focusDuration: number;
  breakDuration: number;
  theme: string;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  notifySessionReminders: boolean;
  notifyBreakReminders: boolean;
  notifyAchievements: boolean;
  soundEffects: boolean;
  autoStartSessions: boolean;
};

export function getSettings(): Promise<SettingsResponse> {
  return authGetJson<SettingsResponse>('/api/users/settings');
}

export function putSettings(body: UpdateSettingsBody): Promise<SettingsResponse> {
  return authPutJson<SettingsResponse>('/api/users/settings', body);
}

export function patchProfile(body: UpdateProfileBody): Promise<MeResponse> {
  return authPatchJson<MeResponse>('/api/users/me', body);
}

export function getAchievements(): Promise<{ achievements: AchievementItem[] }> {
  return authGetJson<{ achievements: AchievementItem[] }>('/api/users/achievements');
}
