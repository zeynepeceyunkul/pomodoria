import type { PomodoroTimerSnapshot } from './pomodoroTimerTypes';

const PREFIX = 'pomodoria_timer_v1_';

export function storageKeyForUser(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function migrateTimerSnapshot(raw: PomodoroTimerSnapshot): PomodoroTimerSnapshot {
  const fm = Math.max(1, typeof raw.focusMinutesSetting === 'number' ? raw.focusMinutesSetting : 25);
  const bm = Math.max(1, typeof raw.breakMinutesSetting === 'number' ? raw.breakMinutesSetting : 5);
  return {
    ...raw,
    focusMinutesSetting: fm,
    breakMinutesSetting: bm,
    longBreakMinutesSetting:
      typeof raw.longBreakMinutesSetting === 'number' ? Math.max(1, raw.longBreakMinutesSetting) : 15,
    sessionsUntilLongBreakSetting:
      typeof raw.sessionsUntilLongBreakSetting === 'number'
        ? Math.min(10, Math.max(2, raw.sessionsUntilLongBreakSetting))
        : 4,
    focusStreakCount: typeof raw.focusStreakCount === 'number' ? Math.max(0, raw.focusStreakCount) : 0,
    activeBreakMinutes:
      typeof raw.activeBreakMinutes === 'number' ? Math.max(1, raw.activeBreakMinutes) : bm,
    plannedFocusMinutes:
      typeof raw.plannedFocusMinutes === 'number' ? Math.max(1, raw.plannedFocusMinutes) : fm,
  };
}

export function loadSnapshot(userId: string): PomodoroTimerSnapshot | null {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PomodoroTimerSnapshot;
    if (parsed?.version !== 1 || (parsed.phase !== 'focus' && parsed.phase !== 'break')) return null;
    if (typeof parsed.remainingSeconds !== 'number') return null;
    return migrateTimerSnapshot(parsed);
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: string, snap: PomodoroTimerSnapshot): void {
  if (!userId) return;
  try {
    sessionStorage.setItem(storageKeyForUser(userId), JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

export function clearSnapshot(userId: string): void {
  if (!userId) return;
  try {
    sessionStorage.removeItem(storageKeyForUser(userId));
  } catch {
    /* ignore */
  }
}

export function defaultSnapshot(
  focusMinutes: number,
  breakMinutes: number,
  longBreakMinutes = 15,
  sessionsUntilLongBreak = 4,
): PomodoroTimerSnapshot {
  const fm = Math.max(1, Math.round(focusMinutes));
  const bm = Math.max(1, Math.round(breakMinutes));
  const lb = Math.max(1, Math.round(longBreakMinutes));
  const su = Math.min(10, Math.max(2, Math.round(sessionsUntilLongBreak)));
  return {
    version: 1,
    phase: 'focus',
    endsAt: null,
    remainingSeconds: fm * 60,
    focusMinutesSetting: fm,
    breakMinutesSetting: bm,
    longBreakMinutesSetting: lb,
    sessionsUntilLongBreakSetting: su,
    focusStreakCount: 0,
    activeBreakMinutes: bm,
    focusStartedAtISO: null,
    plannedFocusMinutes: fm,
  };
}
