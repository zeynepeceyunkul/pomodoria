import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AuthHttpError } from '../api/http';
import { getMySessions, getSessionStats } from '../api/sessions';
import type { SessionRecord, SessionStatsResponse } from '../api/sessions';
import { FocusTimer } from '../components/FocusTimer';
import type { AppOutletContext } from '../layout/outletContext';
import { aggregateSessionRanges, formatMinutes } from '../lib/sessionAggregate';
import { XP_PER_LEVEL, xpIntoCurrentLevel, xpThresholdForCurrentTier } from '../lib/xpDisplay';
import styles from './DashboardPage.module.css';

function IconTarget({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 7v6l4 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFlame({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2s4 4 4 9c0 2.5-1.5 4.5-4 5.5-2.5-1-4-3-4-5.5 0-5 4-9 4-9zm-1 18h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M8 4h8v3c0 3-2 5-4 5s-4-2-4-5V4zm-3 1h3M16 4h3M5 5v1c0 1.5 1 2 2 2M19 5v1c0 1.5-1 2-2 2M10 18h4M9 21h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { me, loadingProfile } = useOutletContext<AppOutletContext>();

  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [sessionList, setSessionList] = useState<SessionRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    setLoadError(null);
    try {
      const [statsRes, sessions] = await Promise.all([getSessionStats(), getMySessions()]);
      setStats(statsRes);
      setSessionList(sessions);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setLoadError(e instanceof Error ? e.message : 'Could not load dashboard.');
      setStats(null);
      setSessionList([]);
    } finally {
      setLoadingData(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (loadingProfile || !me) return;
    void loadDashboard();
  }, [me, loadingProfile, loadDashboard, reloadKey]);

  const agg = useMemo(() => aggregateSessionRanges(sessionList), [sessionList]);

  const xpProgress = useMemo(() => {
    if (!me) return { pct: 0, nextLevel: 2, threshold: XP_PER_LEVEL };
    const xp = me.xp ?? 0;
    const lvl = me.level ?? 1;
    const into = xpIntoCurrentLevel(xp);
    const threshold = xpThresholdForCurrentTier(xp);
    const pct = Math.min(100, Math.round((into / XP_PER_LEVEL) * 100));
    return { pct, nextLevel: lvl + 1, threshold };
  }, [me]);

  const deltaSessions = agg.todaySessions - agg.yesterdaySessions;
  const deltaLabel =
    deltaSessions === 0
      ? 'Same as yesterday'
      : `${deltaSessions > 0 ? '+' : ''}${deltaSessions} from yesterday`;

  if (!loadingProfile && !me) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorInner}>Could not load your profile.</div>
      </div>
    );
  }

  if (loadingProfile || !me) {
    return (
      <div className={styles.loading} aria-busy="true">
        Loading dashboard…
      </div>
    );
  }

  if (loadError && !stats) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorInner} role="alert">
          {loadError}
          <div>
            <button type="button" className={styles.retry} onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingData || !stats) {
    return (
      <div className={styles.loading} aria-busy="true">
        Loading dashboard…
      </div>
    );
  }

  const xp = me.xp ?? 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <section className={styles.card} aria-labelledby="profile-heading">
            <div className={styles.profileAvatar} aria-hidden>
              ?
            </div>
            <h2 id="profile-heading" className={styles.profileName}>
              {me.name}
            </h2>
            <p className={styles.profileLevel}>Level {me.level} Warrior</p>
            <p className={styles.profileSub}>Keep grinding!</p>
          </section>

          <FocusTimer />
        </div>

        <div className={styles.rightCol}>
          <section className={styles.card} aria-labelledby="progress-heading">
            <h2 id="progress-heading" className={styles.cardTitle}>
              Your Progress
            </h2>
            <div className={styles.progressHead}>
              <span className={styles.progressHeadLeft}>XP to Level {xpProgress.nextLevel}</span>
              <span className={styles.progressHeadRight}>
                {xp} / {xpProgress.threshold}
              </span>
            </div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${xpProgress.pct}%` }} />
            </div>
            <div className={styles.streakRow}>
              <div className={styles.streakLeft}>
                <IconFlame className={styles.flameIcon} />
                <div>
                  <p className={styles.streakTextMain}>{me.streak} Day Streak</p>
                  <p className={styles.streakTextSub}>Keep it going!</p>
                </div>
              </div>
              <IconTrophy className={styles.trophyIcon} />
            </div>
          </section>

          <section className={styles.card} aria-labelledby="today-heading">
            <h2 id="today-heading" className={styles.cardTitle}>
              Today&apos;s Focus
            </h2>
            <div className={styles.todayGrid}>
              <div className={styles.miniCard}>
                <IconTarget className={styles.miniIcon} />
                <p className={styles.miniLabel}>Sessions</p>
                <p className={styles.miniValue}>{agg.todaySessions}</p>
                <p className={styles.miniSub}>{deltaLabel}</p>
              </div>
              <div className={styles.miniCard}>
                <IconClock className={styles.miniIcon} />
                <p className={styles.miniLabel}>Focus Time</p>
                <p className={styles.miniValue}>{formatMinutes(agg.todayMinutes)}</p>
                <p className={styles.miniSub}>{agg.todayXp} XP earned</p>
              </div>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="week-heading">
            <h2 id="week-heading" className={styles.cardTitle}>
              This Week
            </h2>
            <ul className={styles.statList}>
              <li className={styles.statRow}>
                <span className={styles.statLabel}>Total Sessions</span>
                <span className={styles.statValue}>{agg.weekSessions}</span>
              </li>
              <li className={styles.statRow}>
                <span className={styles.statLabel}>Total Focus Time</span>
                <span className={styles.statValue}>{formatMinutes(agg.weekMinutes)}</span>
              </li>
              <li className={styles.statRow}>
                <span className={styles.statLabel}>XP Earned</span>
                <span className={styles.statValue}>{agg.weekXp} XP</span>
              </li>
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="insights-heading">
            <h2 id="insights-heading" className={styles.cardTitle}>
              Quick insights
            </h2>
            <p className={styles.aiText}>
              Lifetime totals:{' '}
              <span className={styles.aiHighlight}>{stats.totalSessions}</span> logged sessions,{' '}
              <span className={styles.aiHighlight}>{stats.completedFocusSessions}</span> completed
              focus sessions,{' '}
              <span className={styles.aiHighlight}>{formatMinutes(stats.totalFocusMinutes)}</span>{' '}
              focus minutes, and{' '}
              <span className={styles.aiHighlight}>{stats.totalXpEarned} XP</span> earned from
              sessions. This week you logged{' '}
              <span className={styles.aiHighlight}>{agg.weekSessions}</span> completed focus sessions
              ({formatMinutes(agg.weekMinutes)}).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
