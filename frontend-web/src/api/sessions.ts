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
  taskId?: string | null;
};

export type CreateSessionResponse = {
  session: SessionRecord;
  gamification: {
    newlyUnlockedAchievements: Array<{ id: string; title: string; description?: string }>;
    character: {
      stage: number;
      stageName: string;
      emoji: string;
      progress: number;
    };
    xpBreakdown?: {
      base: number;
      streakBonus: number;
      levelUpBonus: number;
      total: number;
    };
  } | null;
};

export function getSessionStats(): Promise<SessionStatsResponse> {
  return authGetJson<SessionStatsResponse>('/api/sessions/stats');
}

export function getMySessions(): Promise<SessionRecord[]> {
  return authGetJson<SessionRecord[]>('/api/sessions/me');
}

export type CreateFocusSessionBody = {
  type: 'focus';
  duration: number;
  startTime: string;
  completed: boolean;
  endTime?: string;
  taskId?: string;
};

export type SessionAnalyticsResponse = {
  currentStreak: number;
  streakVerified: number;
  longestStreak: number;
  last7Days: Array<{ date: string; focusMinutes: number; completedSessions: number; xpEarned?: number }>;
  thisWeekDaily: Array<{ label: string; focusMinutes: number }>;
  weekdayTotalsAllTime: Array<{ label: string; focusMinutes: number }>;
  mostProductiveWeekday: string | null;
  todayFocusMinutes: number;
  completedFocusSessions: number;
  totalFocusMinutes: number;
  last30DaysXp?: Array<{ date: string; xpEarned: number }>;
  monthlyFocus?: Array<{ label: string; focusMinutes: number }>;
};

export function getSessionAnalytics(): Promise<SessionAnalyticsResponse> {
  return authGetJson<SessionAnalyticsResponse>('/api/sessions/analytics');
}

export type CreateBreakSessionBody = {
  type: 'break';
  duration: number;
  startTime: string;
  completed: boolean;
  endTime?: string;
};

export function createFocusSession(body: CreateFocusSessionBody): Promise<CreateSessionResponse> {
  return authPostJson<CreateSessionResponse>('/api/sessions', body);
}

export function createBreakSession(body: CreateBreakSessionBody): Promise<CreateSessionResponse> {
  return authPostJson<CreateSessionResponse>('/api/sessions', body);
}
