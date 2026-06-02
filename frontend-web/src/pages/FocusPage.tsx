import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getMyTasks } from '../api/tasks';
import type { TaskRecord } from '../api/tasks';
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
  const [openTasks, setOpenTasks] = useState<TaskRecord[]>([]);

  useEffect(() => {
    if (!me) return;
    void getMyTasks()
      .then((list) => setOpenTasks(list.filter((task) => task.status !== 'completed')))
      .catch(() => setOpenTasks([]));
  }, [me]);

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
        {t.phase === 'focus' && openTasks.length > 0 ? (
          <label className={styles.taskSelectWrap}>
            Link to task (optional)
            <select
              className={styles.taskSelect}
              value={t.selectedTaskId ?? ''}
              onChange={(e) => t.setSelectedTaskId(e.target.value || null)}
            >
              <option value="">No task</option>
              {openTasks.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
        {t.phase === 'break' && !t.autoStartSessions ? (
          <p className={styles.footer}>
            Break {t.activeBreakMinutes || bm}m · press <em>Start Focus</em> when ready.
          </p>
        ) : null}
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
