import { useOutletContext } from 'react-router-dom';
import { usePomodoroTimer } from '../timer/PomodoroTimerContext';
import type { AppOutletContext } from '../layout/outletContext';
import styles from './FocusPage.module.css';

function formatClock(totalSec: number): string {
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function FocusPage() {
  const { me, loadingProfile } = useOutletContext<AppOutletContext>();
  const t = usePomodoroTimer();

  const fm = t.focusMinutesSetting;
  const bm = t.breakMinutesSetting;
  const totalFocus = fm * 60;
  const totalBreak =
    t.phase === 'break'
      ? Math.max(1, t.activeBreakMinutes || bm) * 60
      : bm * 60;

  const primaryLabel =
    t.phase === 'break'
      ? t.running
        ? 'Pause'
        : t.displaySeconds <= 0 || t.displaySeconds === totalBreak
          ? 'Start Break'
          : 'Resume'
      : t.running
        ? 'Pause'
        : t.displaySeconds <= 0 || t.displaySeconds === totalFocus
          ? 'Start Focus'
          : 'Resume';

  if (loadingProfile || !me) {
    return (
      <div className={styles.loading} aria-busy="true">
        Loading focus timer…
      </div>
    );
  }

  if (!t.hydrated) {
    return (
      <div className={styles.loading} aria-busy="true">
        Restoring timer…
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={t.phase === 'focus' ? styles.badge : styles.badgeBreak}>
          {t.phase === 'focus' ? 'FOCUS MODE' : 'BREAK TIME'}
        </div>
        <p className={styles.timer} aria-live="polite">
          {formatClock(t.displaySeconds)}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.startBtn}
            onClick={() => {
              t.clearSubmitError();
              t.startPause();
            }}
            disabled={t.submitting}
          >
            {primaryLabel}
          </button>
          <button type="button" className={styles.resetBtn} onClick={t.reset} disabled={t.submitting}>
            Reset
          </button>
          {t.phase === 'break' ? (
            <button type="button" className={styles.skipBtn} onClick={t.skipBreak} disabled={t.submitting}>
              Skip to focus
            </button>
          ) : null}
        </div>
        <p className={styles.footer}>
          {t.phase === 'focus' ? (
            <>Stay focused for {fm} minutes to earn 50 XP</>
          ) : t.autoStartSessions ? (
            <>
              Step away for {t.activeBreakMinutes || bm} minutes — the next focus session will start automatically when
              this break ends.
            </>
          ) : (
            <>
              Step away for {t.activeBreakMinutes || bm} minutes, then press <em>Start Focus</em> when you are ready.
            </>
          )}
        </p>
        <p className={styles.metaMuted}>
          Timer persists while you navigate. Short break {bm}m · Long break {t.longBreakMinutesSetting}m after every{' '}
          {t.sessionsUntilLongBreakSetting} focus sessions
          {t.phase === 'focus' ? (
            <>
              {' '}
              (next break: {t.nextBreakIsLong ? 'long' : 'short'})
            </>
          ) : null}
          .
        </p>
        {t.submitError ? (
          <div className={styles.alert} role="alert">
            <p>{t.submitError}</p>
            {t.phase === 'focus' && t.displaySeconds === 0 && !t.running ? (
              <button type="button" className={styles.retryBtn} onClick={() => void t.retrySaveFocus()} disabled={t.submitting}>
                {t.submitting ? 'Saving…' : 'Retry save'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <button type="button" className={styles.helpFab} aria-label="Help" title="Help">
        ?
      </button>
    </div>
  );
}
