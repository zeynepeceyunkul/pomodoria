export type PomodoroPhase = 'focus' | 'break';

export type PomodoroTimerSnapshot = {
  version: 1;
  phase: PomodoroPhase;
  /** When running: wall-clock ms when active segment ends */
  endsAt: number | null;
  /** When paused / idle: seconds left in current segment */
  remainingSeconds: number;
  focusMinutesSetting: number;
  breakMinutesSetting: number;
  longBreakMinutesSetting: number;
  /** After N completed focus sessions, use long break */
  sessionsUntilLongBreakSetting: number;
  /** Completed focus sessions since last long break (before current break starts) */
  focusStreakCount: number;
  /** Duration (minutes) of the active break segment */
  activeBreakMinutes: number;
  /** Focus run start (for API). Null during break / idle full focus */
  focusStartedAtISO: string | null;
  /** Minutes billed to API for this focus run */
  plannedFocusMinutes: number;
};
