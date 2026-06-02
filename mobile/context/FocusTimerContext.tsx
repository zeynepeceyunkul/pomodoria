import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { AuthHttpError } from '../services/http';
import { createBreakSession, createFocusSession } from '../services/sessions';
import { notifyGamificationResult } from '../lib/gamificationFx';
import { cancelTimerEndNotification, syncPhaseTimerNotification } from '../lib/notifications';

type Phase = 'focus' | 'break';

type FocusTimerContextValue = {
  phase: Phase;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  activeBreakMinutes: number;
  remainingSec: number;
  isRunning: boolean;
  submitting: boolean;
  error: string | null;
  nextBreakIsLong: boolean;
  autoStartSessions: boolean;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  toggle: () => void;
  reset: () => void;
  skipBreak: () => void;
  clearError: () => void;
};

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

const TIMER_STATE_KEY = 'pomodoria.timerState';

type PersistedTimer = {
  phase: Phase;
  endsAt: number;
  remainingSec: number;
  plannedFocusMinutes: number;
  activeBreakMinutes: number;
};

async function persistTimerState(state: PersistedTimer | null): Promise<void> {
  if (!state) {
    await AsyncStorage.removeItem(TIMER_STATE_KEY);
    return;
  }
  await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
}

async function loadTimerState(): Promise<PersistedTimer | null> {
  const raw = await AsyncStorage.getItem(TIMER_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedTimer;
    if (typeof parsed.endsAt !== 'number' || parsed.endsAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function secsForMinutes(m: number): number {
  return Math.max(1, Math.round(m)) * 60;
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { signOut, settings, refreshUser } = useAuth();

  const notifyPrefsRef = useRef({
    notifyBreakReminders: true,
    notifySessionReminders: true,
    notifyAchievements: true,
  });
  notifyPrefsRef.current = {
    notifyBreakReminders: settings?.notifyBreakReminders !== false,
    notifySessionReminders: settings?.notifySessionReminders !== false,
    notifyAchievements: settings?.notifyAchievements !== false,
  };

  const focusMinutes = Math.max(1, Math.round(settings?.focusDuration ?? 25));
  const breakMinutes = Math.max(1, Math.round(settings?.breakDuration ?? 5));
  const longBreakMinutes = Math.max(1, Math.round(settings?.longBreakDuration ?? 15));
  const sessionsUntilLongBreak = Math.min(10, Math.max(2, Math.round(settings?.sessionsUntilLongBreak ?? 4)));
  const autoStartSessions = settings?.autoStartSessions !== false;

  const settingsRef = useRef({
    focusMinutes,
    breakMinutes,
    longBreakMinutes,
    sessionsUntilLongBreak,
    autoStartSessions,
  });
  settingsRef.current = {
    focusMinutes,
    breakMinutes,
    longBreakMinutes,
    sessionsUntilLongBreak,
    autoStartSessions,
  };

  const [phase, setPhase] = useState<Phase>('focus');
  const [remainingSec, setRemainingSec] = useState(() => secsForMinutes(focusMinutes));
  const [isRunning, setIsRunning] = useState(false);
  const [focusStreakCount, setFocusStreakCount] = useState(0);
  const focusStreakRef = useRef(0);
  focusStreakRef.current = focusStreakCount;
  const [activeBreakMinutes, setActiveBreakMinutes] = useState(breakMinutes);
  const activeBreakMinutesRef = useRef(activeBreakMinutes);
  activeBreakMinutesRef.current = activeBreakMinutes;
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const endsAtRef = useRef<number | null>(null);
  const startedAtIsoRef = useRef<string | null>(null);
  const breakStartedAtIsoRef = useRef<string | null>(null);
  const plannedFocusMinutesRef = useRef(focusMinutes);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTickerRef = useRef<() => void>(() => {});
  const completingRef = useRef(false);
  const segmentTransitionRef = useRef(false);
  const lastSavedBreakEndMsRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('focus');
  phaseRef.current = phase;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerHydrated, setTimerHydrated] = useState(false);
  const selectedTaskIdRef = useRef<string | null>(null);
  selectedTaskIdRef.current = selectedTaskId;

  const nextBreakIsLong = focusStreakCount + 1 >= sessionsUntilLongBreak;

  const clearTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const syncScheduledNotification = useCallback((phaseValue: Phase, secondsLeft: number) => {
    void syncPhaseTimerNotification(phaseValue, secondsLeft, notifyPrefsRef.current);
  }, []);

  const enterFocusIdle = useCallback((fm: number) => {
    void persistTimerState(null);
    void cancelTimerEndNotification();
    setPhase('focus');
    setRemainingSec(secsForMinutes(fm));
    plannedFocusMinutesRef.current = fm;
    startedAtIsoRef.current = null;
    endsAtRef.current = null;
    setIsRunning(false);
  }, []);

  const enterBreak = useCallback(
    (autoStart: boolean, streakAfterFocus: number) => {
      const s = settingsRef.current;
      const completed = streakAfterFocus;
      const useLong = completed >= s.sessionsUntilLongBreak;
      const breakMins = useLong ? s.longBreakMinutes : s.breakMinutes;
      const nextStreak = useLong ? 0 : completed;
      setFocusStreakCount(nextStreak);
      setActiveBreakMinutes(breakMins);
      setPhase('break');
      const sec = secsForMinutes(breakMins);
      setRemainingSec(sec);
      startedAtIsoRef.current = null;
      breakStartedAtIsoRef.current = autoStart ? new Date().toISOString() : null;
      if (autoStart) {
        endsAtRef.current = Date.now() + sec * 1000;
        setIsRunning(true);
        void syncPhaseTimerNotification('break', sec, notifyPrefsRef.current);
      } else {
        endsAtRef.current = null;
        setIsRunning(false);
        void cancelTimerEndNotification();
      }
    },
    [],
  );

  const finalizeFocus = useCallback(async () => {
    const fm = plannedFocusMinutesRef.current;
    if (completingRef.current) return;
    completingRef.current = true;
    endsAtRef.current = null;
    void cancelTimerEndNotification();
    setIsRunning(false);
    clearTicker();
    setSubmitting(true);
    setError(null);
    const startISO =
      startedAtIsoRef.current ?? new Date(Date.now() - fm * 60_000).toISOString();
    try {
      const res = await createFocusSession({
        type: 'focus',
        duration: fm,
        startTime: startISO,
        endTime: new Date().toISOString(),
        completed: true,
        ...(selectedTaskIdRef.current ? { taskId: selectedTaskIdRef.current } : {}),
      });
      notifyGamificationResult(res.gamification, {
        notifyAchievements: notifyPrefsRef.current.notifyAchievements,
      });
      startedAtIsoRef.current = null;
      const newStreak = focusStreakRef.current + 1;
      setFocusStreakCount(newStreak);
      void refreshUser();
      enterBreak(settingsRef.current.autoStartSessions, newStreak);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not save session.');
      setRemainingSec(0);
      setPhase('focus');
    } finally {
      setSubmitting(false);
      completingRef.current = false;
    }
  }, [clearTicker, enterBreak, refreshUser, signOut]);

  const saveBreakSession = useCallback(async () => {
    const nowMs = Date.now();
    if (
      lastSavedBreakEndMsRef.current !== null &&
      nowMs - lastSavedBreakEndMsRef.current < 2000
    ) {
      return;
    }
    lastSavedBreakEndMsRef.current = nowMs;
    const breakMins = activeBreakMinutesRef.current;
    const startISO =
      breakStartedAtIsoRef.current ??
      new Date(Date.now() - breakMins * 60_000).toISOString();
    try {
      await createBreakSession({
        type: 'break',
        duration: breakMins,
        startTime: startISO,
        endTime: new Date().toISOString(),
        completed: true,
      });
    } catch {
      /* best-effort */
    }
    breakStartedAtIsoRef.current = null;
  }, []);

  const onSegmentEnd = useCallback(() => {
    if (segmentTransitionRef.current) return;
    segmentTransitionRef.current = true;
    void persistTimerState(null);
    void cancelTimerEndNotification();
    if (phaseRef.current === 'break') {
      void saveBreakSession();
      const fm = settingsRef.current.focusMinutes;
      if (settingsRef.current.autoStartSessions) {
        setPhase('focus');
        const sec = secsForMinutes(fm);
        plannedFocusMinutesRef.current = fm;
        startedAtIsoRef.current = new Date().toISOString();
        setRemainingSec(sec);
        const nextEndsAt = Date.now() + sec * 1000;
        endsAtRef.current = nextEndsAt;
        setIsRunning(true);
        void syncPhaseTimerNotification('focus', sec, notifyPrefsRef.current);
        syncTickerRef.current();
        void persistTimerState({
          phase: 'focus',
          endsAt: nextEndsAt,
          remainingSec: sec,
          plannedFocusMinutes: plannedFocusMinutesRef.current,
          activeBreakMinutes: activeBreakMinutesRef.current,
        });
      } else {
        enterFocusIdle(fm);
      }
      setTimeout(() => {
        segmentTransitionRef.current = false;
      }, 0);
      return;
    }
    void finalizeFocus().finally(() => {
      segmentTransitionRef.current = false;
    });
  }, [enterFocusIdle, finalizeFocus, saveBreakSession]);

  const syncTicker = useCallback(() => {
    clearTicker();
    if (!endsAtRef.current) return;
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current! - Date.now()) / 1000));
      setRemainingSec(left);
      if (left <= 0 && !completingRef.current) {
        clearTicker();
        onSegmentEnd();
      }
    }, 250);
  }, [clearTicker, onSegmentEnd]);
  syncTickerRef.current = syncTicker;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadTimerState();
      if (cancelled || !saved) {
        setTimerHydrated(true);
        return;
      }
      const left = Math.max(0, Math.ceil((saved.endsAt - Date.now()) / 1000));
      if (left < 1) {
        await persistTimerState(null);
        setTimerHydrated(true);
        return;
      }
      phaseRef.current = saved.phase;
      setPhase(saved.phase);
      setRemainingSec(left);
      setActiveBreakMinutes(saved.activeBreakMinutes);
      plannedFocusMinutesRef.current = saved.plannedFocusMinutes;
      endsAtRef.current = saved.endsAt;
      setIsRunning(true);
      void syncPhaseTimerNotification(saved.phase, left, notifyPrefsRef.current);
      syncTicker();
      setTimerHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [syncScheduledNotification, syncTicker]);

  useEffect(() => {
    if (!timerHydrated || endsAtRef.current !== null) return;
    if (phase === 'focus') {
      setRemainingSec(secsForMinutes(focusMinutes));
      plannedFocusMinutesRef.current = focusMinutes;
    }
  }, [focusMinutes, phase, timerHydrated]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'background' && next !== 'inactive') return;
      if (!endsAtRef.current) return;
      const left = Math.max(1, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      void syncPhaseTimerNotification(phaseRef.current, left, notifyPrefsRef.current);
      void persistTimerState({
        phase: phaseRef.current,
        endsAt: endsAtRef.current,
        remainingSec: left,
        plannedFocusMinutes: plannedFocusMinutesRef.current,
        activeBreakMinutes: activeBreakMinutesRef.current,
      });
    });
    return () => sub.remove();
  }, [syncScheduledNotification]);

  useEffect(() => {
    if (isRunning && endsAtRef.current) {
      syncTicker();
    }
    return () => clearTicker();
  }, [isRunning, syncTicker, clearTicker]);

  const toggle = useCallback(() => {
    setError(null);
    if (endsAtRef.current) {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      endsAtRef.current = null;
      void persistTimerState(null);
      void cancelTimerEndNotification();
      clearTicker();
      setIsRunning(false);
      setRemainingSec(left);
      return;
    }

    const full =
      phaseRef.current === 'focus'
        ? secsForMinutes(plannedFocusMinutesRef.current)
        : secsForMinutes(activeBreakMinutes);
    let left = remainingSec <= 0 ? full : remainingSec;

    if (phaseRef.current === 'focus' && left === full) {
      startedAtIsoRef.current = new Date().toISOString();
      plannedFocusMinutesRef.current = settingsRef.current.focusMinutes;
    } else if (phaseRef.current === 'focus' && !startedAtIsoRef.current) {
      startedAtIsoRef.current = new Date(Date.now() - (full - left) * 1000).toISOString();
    } else if (phaseRef.current === 'break' && !breakStartedAtIsoRef.current) {
      breakStartedAtIsoRef.current = new Date(Date.now() - (full - left) * 1000).toISOString();
    }

    const endsAt = Date.now() + left * 1000;
    endsAtRef.current = endsAt;
    setRemainingSec(left);
    setIsRunning(true);
    syncScheduledNotification(phaseRef.current, left);
    void persistTimerState({
      phase: phaseRef.current,
      endsAt,
      remainingSec: left,
      plannedFocusMinutes: plannedFocusMinutesRef.current,
      activeBreakMinutes: activeBreakMinutesRef.current,
    });
    syncTicker();
  }, [activeBreakMinutes, clearTicker, remainingSec, syncScheduledNotification, syncTicker]);

  const reset = useCallback(() => {
    setError(null);
    completingRef.current = false;
    segmentTransitionRef.current = false;
    endsAtRef.current = null;
    void persistTimerState(null);
    void cancelTimerEndNotification();
    startedAtIsoRef.current = null;
    clearTicker();
    setIsRunning(false);
    setPhase('focus');
    setFocusStreakCount(0);
    setActiveBreakMinutes(settingsRef.current.breakMinutes);
    setRemainingSec(secsForMinutes(settingsRef.current.focusMinutes));
    plannedFocusMinutesRef.current = settingsRef.current.focusMinutes;
  }, [clearTicker]);

  const skipBreak = useCallback(() => {
    if (phaseRef.current !== 'break') return;
    void cancelTimerEndNotification();
    breakStartedAtIsoRef.current = null;
    clearTicker();
    completingRef.current = false;
    enterFocusIdle(settingsRef.current.focusMinutes);
  }, [clearTicker, enterFocusIdle]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<FocusTimerContextValue>(
    () => ({
      phase,
      focusMinutes,
      breakMinutes,
      longBreakMinutes,
      activeBreakMinutes,
      remainingSec,
      isRunning,
      submitting,
      error,
      nextBreakIsLong,
      autoStartSessions,
      selectedTaskId,
      setSelectedTaskId,
      toggle,
      reset,
      skipBreak,
      clearError,
    }),
    [
      phase,
      focusMinutes,
      breakMinutes,
      longBreakMinutes,
      activeBreakMinutes,
      remainingSec,
      isRunning,
      submitting,
      error,
      nextBreakIsLong,
      autoStartSessions,
      selectedTaskId,
      toggle,
      reset,
      skipBreak,
      clearError,
    ],
  );

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

export function useFocusTimer(): FocusTimerContextValue {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) {
    throw new Error('useFocusTimer must be used within FocusTimerProvider');
  }
  return ctx;
}
