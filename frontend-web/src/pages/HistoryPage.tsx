import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthHttpError } from '../api/http';
import { getMySessions } from '../api/sessions';
import type { SessionRecord } from '../api/sessions';
import {
  countCompletedAllTime,
  countCompletedInMonth,
  countCompletedInWeek,
  sortSessionsNewestFirst,
} from '../lib/historyStats';
import styles from './HistoryPage.module.css';

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconMedal({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 14l-2 8M16 14l2 8M10 22h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function typeLabel(type: SessionRecord['type']): string {
  return type === 'focus' ? 'Focus' : 'Break';
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMySessions();
      setSessions(data);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load sessions.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const sorted = useMemo(() => sortSessionsNewestFirst(sessions), [sessions]);

  const weekCount = useMemo(() => countCompletedInWeek(sessions), [sessions]);
  const monthCount = useMemo(() => countCompletedInMonth(sessions), [sessions]);
  const allCount = useMemo(() => countCompletedAllTime(sessions), [sessions]);

  if (loading && sessions.length === 0 && !error) {
    return (
      <div className={styles.loading} aria-busy="true">
        Loading session history…
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorInner} role="alert">
          {error}
          <div>
            <button type="button" className={styles.retry} onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.headRow}>
        <h1 className={styles.title}>Session History</h1>
        <p className={styles.totalMeta}>Total Sessions: {sessions.length}</p>
      </header>

      <section className={styles.tableCard} aria-label="Session list">
        {sorted.length === 0 ? (
          <p className={styles.empty}>No sessions yet. Complete a focus run to see it here.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={styles.th}>
                    <span className={styles.thInner}>
                      <IconCalendar />
                      Date
                    </span>
                  </th>
                  <th scope="col" className={styles.th}>
                    <span className={styles.thInner}>
                      <IconClock />
                      Time
                    </span>
                  </th>
                  <th scope="col" className={styles.th}>
                    <span className={styles.thInner}>Duration</span>
                  </th>
                  <th scope="col" className={styles.th}>
                    <span className={styles.thInner}>Type</span>
                  </th>
                  <th scope="col" className={styles.th}>
                    <span className={styles.thInner}>
                      <IconMedal />
                      XP Earned
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s._id}>
                    <td className={styles.td}>{formatSessionDate(s.startTime)}</td>
                    <td className={styles.td}>{formatSessionTime(s.startTime)}</td>
                    <td className={`${styles.td} ${styles.tdStrong}`}>{s.duration} min</td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.badge} ${s.type === 'focus' ? styles.badgeFocus : styles.badgeBreak}`}
                      >
                        {typeLabel(s.type)}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.xp}`}>+{s.xpEarned} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>This Week</p>
          <p className={styles.summaryValue}>{weekCount}</p>
          <p className={styles.summarySub}>sessions completed</p>
        </article>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>This Month</p>
          <p className={styles.summaryValue}>{monthCount}</p>
          <p className={styles.summarySub}>sessions completed</p>
        </article>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>All Time</p>
          <p className={styles.summaryValue}>{allCount}</p>
          <p className={styles.summarySub}>sessions completed</p>
        </article>
      </div>

      <button type="button" className={styles.helpFab} aria-label="Help" title="Help">
        ?
      </button>
    </div>
  );
}
