import { authGetJson, authPatchJson, authPutJson } from './http';
import type { CharacterState } from '../lib/characterEvolution';

export type MeResponse = {
  _id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  streak: number;
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
  character?: CharacterState;
};

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

export function getMe(): Promise<MeResponse> {
  return authGetJson<MeResponse>('/api/users/me');
}

export function getProgress(): Promise<ProgressResponse> {
  return authGetJson<ProgressResponse>('/api/users/progress');
}

export function getSettings(): Promise<SettingsResponse> {
  return authGetJson<SettingsResponse>('/api/users/settings');
}

export function patchProfile(body: { name?: string; avatar?: string | null }): Promise<MeResponse> {
  return authPatchJson<MeResponse>('/api/users/me', body);
}

export function putSettings(body: UpdateSettingsBody): Promise<SettingsResponse> {
  return authPutJson<SettingsResponse>('/api/users/settings', body);
}

export function getAchievements(): Promise<{ achievements: AchievementItem[] }> {
  return authGetJson<{ achievements: AchievementItem[] }>('/api/users/achievements');
}
