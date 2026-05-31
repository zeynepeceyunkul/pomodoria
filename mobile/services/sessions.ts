import { authGetJson, authPostJson } from './http';

export type SessionStatsResponse = {
  totalSessions: number;
  completedFocusSessions: number;
  totalFocusMinutes: number;
  totalXpEarned: number;
};

export type SessionRecord = {
  _id: string;
  type: 'focus' | 'break';
  duration: number;
  startTime: string;
  endTime?: string;
  completed: boolean;
  xpEarned: number;
};

export type CreateFocusSessionBody = {
  type: 'focus';
  duration: number;
  startTime: string;
  completed: boolean;
  endTime?: string;
};

export function getSessionStats(): Promise<SessionStatsResponse> {
  return authGetJson<SessionStatsResponse>('/api/sessions/stats');
}

export function getMySessions(): Promise<SessionRecord[]> {
  return authGetJson<SessionRecord[]>('/api/sessions/me');
}

export type SessionAnalyticsResponse = {
  currentStreak: number;
  streakVerified: number;
  longestStreak: number;
  last7Days: Array<{ date: string; focusMinutes: number; completedSessions: number }>;
  thisWeekDaily: Array<{ label: string; focusMinutes: number }>;
  weekdayTotalsAllTime: Array<{ label: string; focusMinutes: number }>;
  mostProductiveWeekday: string | null;
  todayFocusMinutes: number;
  completedFocusSessions: number;
  totalFocusMinutes: number;
};

export function getSessionAnalytics(): Promise<SessionAnalyticsResponse> {
  return authGetJson<SessionAnalyticsResponse>('/api/sessions/analytics');
}

export function createFocusSession(body: CreateFocusSessionBody): Promise<SessionRecord> {
  return authPostJson<SessionRecord>('/api/sessions', body);
}
