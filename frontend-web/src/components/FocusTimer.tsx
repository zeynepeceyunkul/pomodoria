import { usePomodoroTimer } from '../timer/PomodoroTimerContext';
import styles from './FocusTimer.module.css';

function formatClock(totalSec: number): string {
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Dashboard mirror of the global Pomodoro timer (persists across routes). */
export function FocusTimer() {
  const {
    displaySeconds,
    phase,
    running,
    submitting,
    hydrated,
    startPause,
    reset,
    focusMinutesSetting,
    breakMinutesSetting,
    activeBreakMinutes,
  } = usePomodoroTimer();

  if (!hydrated) {
    return (
      <section className={styles.card} aria-label="Focus session timer">
        <p className={styles.label}>Focus Session</p>
        <p className={styles.timer}>--:--</p>
      </section>
    );
  }

  const totalFocus = focusMinutesSetting * 60;
  const totalBreak =
    phase === 'break' ? Math.max(1, activeBreakMinutes || breakMinutesSetting) * 60 : breakMinutesSetting * 60;

  const primaryLabel =
    phase === 'break'
      ? running
        ? 'Pause'
        : displaySeconds <= 0 || displaySeconds === totalBreak
          ? 'Start Break'
          : 'Resume'
      : running
        ? 'Pause'
        : displaySeconds <= 0 || displaySeconds === totalFocus
          ? 'Start Focus'
          : 'Resume';

  const heading = phase === 'focus' ? 'Focus Session' : 'Break';

  return (
    <section className={styles.card} aria-label="Pomodoro timer">
      <p className={styles.label}>{heading}</p>
      <p className={styles.timer}>{formatClock(displaySeconds)}</p>
      <div className={styles.controls}>
        <button type="button" className={styles.start} onClick={startPause} disabled={submitting}>
          {primaryLabel}
        </button>
        <div className={styles.secondary}>
          <button type="button" className={styles.secondaryBtn} onClick={reset} disabled={submitting}>
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
