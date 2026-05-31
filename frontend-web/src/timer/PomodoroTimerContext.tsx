import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { createFocusSession } from '../api/sessions';
import { AuthHttpError } from '../api/http';
import { playTimerChime, tryDesktopNotify } from '../lib/timerFx';
import type { PomodoroPhase, PomodoroTimerSnapshot } from './pomodoroTimerTypes';
import {
  defaultSnapshot,
  loadSnapshot,
  migrateTimerSnapshot,
  saveSnapshot,
} from './pomodoroTimerStorage';

type PomodoroPrefs = {
  notifySessionReminders: boolean;
  notifyBreakReminders: boolean;
  notifyAchievements: boolean;
  soundEffects: boolean;
  autoStartSessions: boolean;
};

type PomodoroTimerContextValue = {
  displaySeconds: number;
  phase: PomodoroPhase;
  running: boolean;
  submitting: boolean;
  submitError: string | null;
  focusMinutesSetting: number;
  breakMinutesSetting: number;
  longBreakMinutesSetting: number;
  sessionsUntilLongBreakSetting: number;
  focusStreakCount: number;
  activeBreakMinutes: number;
  nextBreakIsLong: boolean;
  autoStartSessions: boolean;
  startPause: () => void;
  reset: () => void;
  skipBreak: () => void;
  clearSubmitError: () => void;
  retrySaveFocus: () => Promise<void>;
  hydrated: boolean;
};

const PomodoroTimerContext = createContext<PomodoroTimerContextValue | null>(null);

function breakStateAfterFocus(prev: PomodoroTimerSnapshot): {
  breakMins: number;
  nextStreak: number;
} {
  const completed = prev.focusStreakCount + 1;
  const useLong = completed >= prev.sessionsUntilLongBreakSetting;
  const breakMins = useLong ? prev.longBreakMinutesSetting : prev.breakMinutesSetting;
  const nextStreak = useLong ? 0 : completed;
  return { breakMins, nextStreak };
}

/** Break runs immediately after a completed focus (auto-start mode). */
function enterBreakAfterFocus(prev: PomodoroTimerSnapshot): PomodoroTimerSnapshot {
  const { breakMins, nextStreak } = breakStateAfterFocus(prev);
  const endsAt = Date.now() + breakMins * 60_000;
  return {
    ...prev,
    phase: 'break',
    endsAt,
    remainingSeconds: breakMins * 60,
    activeBreakMinutes: breakMins,
    focusStartedAtISO: null,
    plannedFocusMinutes: prev.focusMinutesSetting,
    focusStreakCount: nextStreak,
  };
}

/** Break is ready but paused until the user presses Start (manual mode). */
function enterBreakPausedAfterFocus(prev: PomodoroTimerSnapshot): PomodoroTimerSnapshot {
  const { breakMins, nextStreak } = breakStateAfterFocus(prev);
  return {
    ...prev,
    phase: 'break',
    endsAt: null,
    remainingSeconds: breakMins * 60,
    activeBreakMinutes: breakMins,
    focusStartedAtISO: null,
    plannedFocusMinutes: prev.focusMinutesSetting,
    focusStreakCount: nextStreak,
  };
}

/** Focus segment runs immediately (auto-start after break). */
function enterFocusRunning(prev: PomodoroTimerSnapshot, now = Date.now()): PomodoroTimerSnapshot {
  const fm = prev.focusMinutesSetting;
  const sec = fm * 60;
  return {
    ...prev,
    phase: 'focus',
    endsAt: now + sec * 1000,
    remainingSeconds: sec,
    focusStartedAtISO: new Date(now).toISOString(),
    plannedFocusMinutes: fm,
    activeBreakMinutes: prev.breakMinutesSetting,
  };
}

function enterIdleFocusFull(prev: PomodoroTimerSnapshot): PomodoroTimerSnapshot {
  const fm = prev.focusMinutesSetting;
  return {
    ...prev,
    phase: 'focus',
    endsAt: null,
    remainingSeconds: fm * 60,
    focusStartedAtISO: null,
    plannedFocusMinutes: fm,
    activeBreakMinutes: prev.breakMinutesSetting,
  };
}

async function postCompletedFocus(prev: PomodoroTimerSnapshot): Promise<void> {
  const minutes = prev.plannedFocusMinutes;
  const startISO =
    prev.focusStartedAtISO ?? new Date(Date.now() - minutes * 60_000).toISOString();
  await createFocusSession({
    type: 'focus',
    duration: minutes,
    startTime: startISO,
    endTime: new Date().toISOString(),
    completed: true,
  });
}

type ProviderProps = {
  userId: string;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  prefs: PomodoroPrefs;
  children: ReactNode;
};

export function PomodoroTimerProvider({
  userId,
  focusMinutes,
  breakMinutes,
  longBreakMinutes,
  sessionsUntilLongBreak,
  prefs,
  children,
}: ProviderProps) {
  const navigate = useNavigate();
  const settingsRef = useRef({
    focusMinutes,
    breakMinutes,
    longBreakMinutes,
    sessionsUntilLongBreak,
    prefs,
  });
  settingsRef.current = {
    focusMinutes,
    breakMinutes,
    longBreakMinutes,
    sessionsUntilLongBreak,
    prefs,
  };

  const [snap, setSnap] = useState<PomodoroTimerSnapshot>(() =>
    defaultSnapshot(focusMinutes, breakMinutes, longBreakMinutes, sessionsUntilLongBreak),
  );
  const [tick, setTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const snapRef = useRef(snap);
  snapRef.current = snap;

  const submittingRef = useRef(submitting);
  submittingRef.current = submitting;

  const handlingEndRef = useRef(false);

  const persist = useCallback(
    (next: PomodoroTimerSnapshot) => {
      if (userId) saveSnapshot(userId, next);
    },
    [userId],
  );

  const onFocusCompletedFx = useCallback(() => {
    const p = settingsRef.current.prefs;
    if (p.soundEffects) playTimerChime('end');
    if (p.notifyBreakReminders) {
      tryDesktopNotify('Break time', 'Your focus session finished — take a break.');
    }
    if (p.notifyAchievements) {
      tryDesktopNotify('Progress saved', 'Session recorded. Check Profile for XP and achievements.');
    }
  }, []);

  const onBreakCompletedFx = useCallback(() => {
    const p = settingsRef.current.prefs;
    if (p.soundEffects) playTimerChime('end');
    if (p.notifySessionReminders) {
      tryDesktopNotify('Focus time', 'Break is over — ready when you are.');
    }
  }, []);

  const finalizeFocusEnd = useCallback(
    async (prev: PomodoroTimerSnapshot) => {
      if (handlingEndRef.current) return;
      handlingEndRef.current = true;
      setSubmitting(true);
      submittingRef.current = true;
      setSubmitError(null);
      try {
        await postCompletedFocus(prev);
        onFocusCompletedFx();
        const autoStart = settingsRef.current.prefs.autoStartSessions;
        const next = autoStart ? enterBreakAfterFocus(prev) : enterBreakPausedAfterFocus(prev);
        setSnap(next);
        persist(next);
      } catch (e) {
        if (e instanceof AuthHttpError && e.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        const msg = e instanceof Error ? e.message : 'Could not save session.';
        setSubmitError(msg);
        const stuck: PomodoroTimerSnapshot = {
          ...prev,
          endsAt: null,
          remainingSeconds: 0,
          phase: 'focus',
        };
        setSnap(stuck);
        persist(stuck);
      } finally {
        setSubmitting(false);
        submittingRef.current = false;
        handlingEndRef.current = false;
      }
    },
    [navigate, persist, onFocusCompletedFx],
  );

  /** Load persisted timer for this user only when userId changes. */
  useEffect(() => {
    if (!userId) {
      setHydrated(true);
      return;
    }

    let cancelled = false;
    setHydrated(false);

    void (async () => {
      const { focusMinutes: fmR, breakMinutes: bmR, longBreakMinutes: lbR, sessionsUntilLongBreak: suR } =
        settingsRef.current;
      const fm = Math.max(1, Math.round(fmR));
      const bm = Math.max(1, Math.round(bmR));
      const lb = Math.max(1, Math.round(lbR));
      const su = Math.min(10, Math.max(2, Math.round(suR)));

      let s = loadSnapshot(userId) ?? defaultSnapshot(fm, bm, lb, su);
      s = migrateTimerSnapshot({
        ...s,
        focusMinutesSetting: fm,
        breakMinutesSetting: bm,
        longBreakMinutesSetting: lb,
        sessionsUntilLongBreakSetting: su,
      });

      const now = Date.now();

      if (s.endsAt && now >= s.endsAt) {
        const autoStart = settingsRef.current.prefs.autoStartSessions;
        if (s.phase === 'break') {
          s = autoStart ? enterFocusRunning(s, now) : enterIdleFocusFull(s);
        } else {
          try {
            setSubmitting(true);
            submittingRef.current = true;
            await postCompletedFocus(s);
            if (cancelled) return;
            s = autoStart ? enterBreakAfterFocus(s) : enterBreakPausedAfterFocus(s);
          } catch (e) {
            if (cancelled) return;
            if (e instanceof AuthHttpError && e.status === 401) {
              navigate('/login', { replace: true });
              return;
            }
            const msg = e instanceof Error ? e.message : 'Could not save session.';
            setSubmitError(msg);
            s = { ...s, endsAt: null, remainingSeconds: 0, phase: 'focus' };
          } finally {
            setSubmitting(false);
            submittingRef.current = false;
          }
        }
      }

      if (!cancelled) {
        setSnap(s);
        saveSnapshot(userId, s);
        setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, navigate]);

  /** Apply timer-related settings from profile without wiping an in-progress run. */
  useEffect(() => {
    if (!userId || !hydrated) return;
    const fm = Math.max(1, Math.round(focusMinutes));
    const bm = Math.max(1, Math.round(breakMinutes));
    const lb = Math.max(1, Math.round(longBreakMinutes));
    const su = Math.min(10, Math.max(2, Math.round(sessionsUntilLongBreak)));

    setSnap((prev) => {
      const settingsMatch =
        prev.focusMinutesSetting === fm &&
        prev.breakMinutesSetting === bm &&
        prev.longBreakMinutesSetting === lb &&
        prev.sessionsUntilLongBreakSetting === su;

      if (settingsMatch) return prev;

      let next: PomodoroTimerSnapshot = {
        ...prev,
        focusMinutesSetting: fm,
        breakMinutesSetting: bm,
        longBreakMinutesSetting: lb,
        sessionsUntilLongBreakSetting: su,
        plannedFocusMinutes: prev.phase === 'focus' ? fm : prev.plannedFocusMinutes,
      };

      const idleFocusReady =
        !next.endsAt && next.phase === 'focus' && next.focusStartedAtISO === null;

      if (idleFocusReady) {
        next = {
          ...next,
          remainingSeconds: fm * 60,
          plannedFocusMinutes: fm,
          activeBreakMinutes: bm,
        };
      }

      saveSnapshot(userId, next);
      return next;
    });
  }, [userId, hydrated, focusMinutes, breakMinutes, longBreakMinutes, sessionsUntilLongBreak]);

  /** Wall-clock driven segment completion (works when tab is backgrounded). */
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((x) => x + 1);
      const prev = snapRef.current;
      if (!prev.endsAt) return;
      if (Date.now() < prev.endsAt) return;
      if (handlingEndRef.current || submittingRef.current) return;

      if (prev.phase === 'break') {
        onBreakCompletedFx();
        const autoStart = settingsRef.current.prefs.autoStartSessions;
        const next = autoStart ? enterFocusRunning(prev) : enterIdleFocusFull(prev);
        setSnap(next);
        persist(next);
        if (autoStart && settingsRef.current.prefs.soundEffects) {
          queueMicrotask(() => playTimerChime('start'));
        }
        return;
      }

      if (prev.phase === 'focus') {
        void finalizeFocusEnd(prev);
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [finalizeFocusEnd, persist, onBreakCompletedFx]);

  const displaySeconds = useMemo(() => {
    void tick;
    const s = snap;
    if (s.endsAt) {
      return Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
    }
    return Math.max(0, s.remainingSeconds);
  }, [snap, tick]);

  const running = Boolean(snap.endsAt);

  const nextBreakIsLong =
    snap.focusStreakCount + 1 >= snap.sessionsUntilLongBreakSetting;

  const startPause = useCallback(() => {
    setSubmitError(null);
    setSnap((prev) => {
      const now = Date.now();
      const sfx = settingsRef.current.prefs.soundEffects;

      if (prev.endsAt) {
        const left = Math.max(0, Math.ceil((prev.endsAt - now) / 1000));
        const next: PomodoroTimerSnapshot = { ...prev, endsAt: null, remainingSeconds: left };
        persist(next);
        return next;
      }

      const fm = prev.focusMinutesSetting;
      const fullFocus = fm * 60;
      const fullBreak =
        prev.phase === 'break'
          ? Math.max(1, prev.activeBreakMinutes || prev.breakMinutesSetting) * 60
          : prev.breakMinutesSetting * 60;

      if (prev.phase === 'focus') {
        let left = prev.remainingSeconds <= 0 ? fullFocus : prev.remainingSeconds;
        if (left === 0) left = fullFocus;

        let iso = prev.focusStartedAtISO;
        if (!iso) {
          iso = new Date(now - (fullFocus - left) * 1000).toISOString();
        }

        const next: PomodoroTimerSnapshot = {
          ...prev,
          remainingSeconds: left,
          endsAt: now + left * 1000,
          focusStartedAtISO: iso,
          plannedFocusMinutes: fm,
        };
        persist(next);
        if (sfx) queueMicrotask(() => playTimerChime('start'));
        return next;
      }

      let left = prev.remainingSeconds <= 0 ? fullBreak : prev.remainingSeconds;
      if (left === 0) left = fullBreak;

      const next: PomodoroTimerSnapshot = {
        ...prev,
        remainingSeconds: left,
        endsAt: now + left * 1000,
      };
      persist(next);
      if (sfx) queueMicrotask(() => playTimerChime('start'));
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    setSubmitError(null);
    setSnap((prev) => {
      if (prev.phase === 'break') {
        const mins = Math.max(1, prev.activeBreakMinutes || prev.breakMinutesSetting);
        const next: PomodoroTimerSnapshot = {
          ...prev,
          endsAt: null,
          remainingSeconds: mins * 60,
          activeBreakMinutes: mins,
        };
        persist(next);
        return next;
      }
      const next = enterIdleFocusFull(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const skipBreak = useCallback(() => {
    setSubmitError(null);
    onBreakCompletedFx();
    setSnap((prev) => {
      const now = Date.now();
      const next = enterFocusRunning(prev, now);
      persist(next);
      if (settingsRef.current.prefs.soundEffects) {
        queueMicrotask(() => playTimerChime('start'));
      }
      return next;
    });
  }, [persist, onBreakCompletedFx]);

  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  const retrySaveFocus = useCallback(async () => {
    const prev = snapRef.current;
    if (prev.phase !== 'focus' || prev.remainingSeconds !== 0 || prev.endsAt) return;
    await finalizeFocusEnd(prev);
  }, [finalizeFocusEnd]);

  const value = useMemo<PomodoroTimerContextValue>(
    () => ({
      displaySeconds,
      phase: snap.phase,
      running,
      submitting,
      submitError,
      focusMinutesSetting: snap.focusMinutesSetting,
      breakMinutesSetting: snap.breakMinutesSetting,
      longBreakMinutesSetting: snap.longBreakMinutesSetting,
      sessionsUntilLongBreakSetting: snap.sessionsUntilLongBreakSetting,
      focusStreakCount: snap.focusStreakCount,
      activeBreakMinutes: snap.activeBreakMinutes,
      nextBreakIsLong,
      autoStartSessions: settingsRef.current.prefs.autoStartSessions,
      startPause,
      reset,
      skipBreak,
      clearSubmitError,
      retrySaveFocus,
      hydrated,
    }),
    [
      displaySeconds,
      snap.phase,
      snap.focusMinutesSetting,
      snap.breakMinutesSetting,
      snap.longBreakMinutesSetting,
      snap.sessionsUntilLongBreakSetting,
      snap.focusStreakCount,
      snap.activeBreakMinutes,
      nextBreakIsLong,
      prefs.autoStartSessions,
      running,
      submitting,
      submitError,
      startPause,
      reset,
      skipBreak,
      clearSubmitError,
      retrySaveFocus,
      hydrated,
    ],
  );

  return <PomodoroTimerContext.Provider value={value}>{children}</PomodoroTimerContext.Provider>;
}

export function usePomodoroTimer(): PomodoroTimerContextValue {
  const ctx = useContext(PomodoroTimerContext);
  if (!ctx) {
    throw new Error('usePomodoroTimer must be used within PomodoroTimerProvider');
  }
  return ctx;
}
