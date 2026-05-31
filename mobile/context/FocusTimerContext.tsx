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
import { useAuth } from './AuthContext';
import { AuthHttpError } from '../services/http';
import { createFocusSession } from '../services/sessions';

type FocusTimerContextValue = {
  focusMinutes: number;
  remainingSec: number;
  isRunning: boolean;
  submitting: boolean;
  error: string | null;
  toggle: () => void;
  reset: () => void;
  clearError: () => void;
};

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

function formatTotalSeconds(fm: number): number {
  return Math.max(1, Math.round(fm)) * 60;
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { signOut, settings, refreshSettings, refreshUser } = useAuth();
  const focusMinutes = Math.max(1, Math.round(settings?.focusDuration ?? 25));
  const focusMinutesRef = useRef(focusMinutes);
  focusMinutesRef.current = focusMinutes;

  const [remainingSec, setRemainingSec] = useState(() => formatTotalSeconds(focusMinutes));
  const [isRunning, setIsRunning] = useState(false);
  const endsAtRef = useRef<number | null>(null);
  const startedAtIsoRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completingRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSec = formatTotalSeconds(focusMinutes);

  const clearTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const finalizeSession = useCallback(async () => {
    const fm = focusMinutesRef.current;
    if (completingRef.current) return;
    completingRef.current = true;
    endsAtRef.current = null;
    setIsRunning(false);
    clearTicker();
    setSubmitting(true);
    setError(null);
    const startISO =
      startedAtIsoRef.current ?? new Date(Date.now() - fm * 60_000).toISOString();
    try {
      await createFocusSession({
        type: 'focus',
        duration: fm,
        startTime: startISO,
        endTime: new Date().toISOString(),
        completed: true,
      });
      startedAtIsoRef.current = null;
      setRemainingSec(formatTotalSeconds(fm));
      void refreshSettings();
      void refreshUser();
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await signOut();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not save session.');
      setRemainingSec(0);
    } finally {
      setSubmitting(false);
      completingRef.current = false;
    }
  }, [clearTicker, signOut, refreshSettings, refreshUser]);

  useEffect(() => {
    return () => clearTicker();
  }, [clearTicker]);

  const syncTicker = useCallback(() => {
    clearTicker();
    if (!endsAtRef.current) return;
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current! - Date.now()) / 1000));
      setRemainingSec(left);
      if (left <= 0 && !completingRef.current) {
        void finalizeSession();
      }
    }, 250);
  }, [clearTicker, finalizeSession]);

  /** When focus duration changes from Settings, reset idle timer to new length. */
  useEffect(() => {
    if (endsAtRef.current !== null) return;
    setRemainingSec(totalSec);
    startedAtIsoRef.current = null;
  }, [totalSec]);

  const toggle = useCallback(() => {
    setError(null);
    const fm = focusMinutesRef.current;
    const full = formatTotalSeconds(fm);
    if (endsAtRef.current) {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      endsAtRef.current = null;
      clearTicker();
      setIsRunning(false);
      setRemainingSec(left);
      return;
    }

    let left = remainingSec <= 0 ? full : remainingSec;
    if (left === full) {
      startedAtIsoRef.current = new Date().toISOString();
    } else if (!startedAtIsoRef.current) {
      startedAtIsoRef.current = new Date(Date.now() - (full - left) * 1000).toISOString();
    }

    const endsAt = Date.now() + left * 1000;
    endsAtRef.current = endsAt;
    setRemainingSec(left);
    setIsRunning(true);
    syncTicker();
  }, [remainingSec, clearTicker, syncTicker]);

  const reset = useCallback(() => {
    setError(null);
    completingRef.current = false;
    endsAtRef.current = null;
    startedAtIsoRef.current = null;
    clearTicker();
    setIsRunning(false);
    setRemainingSec(formatTotalSeconds(focusMinutesRef.current));
  }, [clearTicker]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<FocusTimerContextValue>(
    () => ({
      focusMinutes,
      remainingSec,
      isRunning,
      submitting,
      error,
      toggle,
      reset,
      clearError,
    }),
    [focusMinutes, remainingSec, isRunning, submitting, error, toggle, reset, clearError],
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
