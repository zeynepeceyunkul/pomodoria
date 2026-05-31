import { authGetJson, authPutJson } from './http';

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
  level: number;
  xp: number;
  streak: number;
  createdAt?: string;
  updatedAt?: string;
  settings?: UserSettingsEmbedded;
};

/** Matches GET /api/users/progress — `xpToNextLevel` is XP still needed for the next level. */
export type ProgressResponse = {
  xp: number;
  level: number;
  streak: number;
  xpToNextLevel: number;
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
