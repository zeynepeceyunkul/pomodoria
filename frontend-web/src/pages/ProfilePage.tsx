import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AuthHttpError } from '../api/http';
import { getProgress, getAchievements } from '../api/users';
import type { AchievementItem, ProgressResponse } from '../api/users';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { buildCharacterState } from '../lib/characterEvolution';
import { getSessionStats, getMySessions } from '../api/sessions';
import type { SessionStatsResponse } from '../api/sessions';
import type { AppOutletContext } from '../layout/outletContext';
import { longestCompletedFocusStreakDays } from '../lib/longestStreak';
import { formatMinutes } from '../lib/sessionAggregate';
import { XP_PER_LEVEL, xpIntoCurrentLevel } from '../lib/xpDisplay';
import styles from './ProfilePage.module.css';

function emailLocalPart(email: string): string {
  const i = email.indexOf('@');
  return i > 0 ? email.slice(0, i) : email;
}

function IconBolt() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
      />
    </svg>
  );
}

function IconTargetSmall() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function IconFlame() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2s4 4 4 9c0 2.5-1.5 4.5-4 5.5-2.5-1-4-3-4-5.5 0-5 4-9 4-9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
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

function IconRibbon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 5l2 4 4 .5-3 3 .8 4.5L12 15l-3.8 2 .8-4.5-3-3 4-.5L12 5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type AchievementRow = AchievementItem;

function memberSinceLabel(createdAt?: string): string {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function averageDailyMinutes(totalFocusMinutes: number, createdAt?: string): number {
  if (!createdAt) return 0;
  const start = new Date(createdAt).getTime();
  const now = Date.now();
  const days = Math.max(1, Math.ceil((now - start) / 86400000));
  return totalFocusMinutes / days;
}

function totalFocusHoursLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h <= 0) return `${m}m`;
  return m >= 30 ? `${h}h ${m}m` : `${h}h`;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { me, loadingProfile } = useOutletContext<AppOutletContext>();

  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [bestHistoryStreak, setBestHistoryStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, st, sessions, ach] = await Promise.all([
        getProgress(),
        getSessionStats(),
        getMySessions(),
        getAchievements(),
      ]);
      setProgress(p);
      setStats(st);
      setBestHistoryStreak(longestCompletedFocusStreakDays(sessions));
      setAchievements(ach.achievements);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load profile.');
      setProgress(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (loadingProfile || !me) return;
    void load();
  }, [me, loadingProfile, load, reloadKey]);

  const xpBarPct = useMemo(() => {
    if (!progress) return 0;
    const into = xpIntoCurrentLevel(progress.xp);
    return Math.min(100, Math.round((into / XP_PER_LEVEL) * 100));
  }, [progress]);

  const xpCeiling = useMemo(() => {
    if (!progress) return 0;
    return progress.xp + progress.xpToNextLevel;
  }, [progress]);

  if (loadingProfile || !me) {
    return (
      <div className={styles.loading} aria-busy="true">
        Loading profile…
      </div>
    );
  }

  if (loading && (!progress || !stats)) {
    return (
      <div className={styles.loading} aria-busy="true">
        Loading profile data…
      </div>
    );
  }

  if (!progress || !stats) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorInner} role="alert">
          {error ?? 'Could not load profile data.'}
          <div>
            <button type="button" className={styles.retry} onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const bestStreakDays = Math.max(progress.streak, bestHistoryStreak);

  const handle = `@${emailLocalPart(me.email)}`;
  const avgDaily = averageDailyMinutes(stats.totalFocusMinutes, me.createdAt);
  const avgLabel = me.createdAt ? formatMinutes(Math.round(avgDaily)) : '—';

  const character = progress.character ?? buildCharacterState(progress.level);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile &amp; Progress</h1>

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <section className={styles.card}>
            <div className={styles.userHead}>
              {me.avatar ? (
                <div className={styles.userPhotoWrap}>
                  <img src={me.avatar} alt="" className={styles.userPhoto} />
                </div>
              ) : (
                <div className={styles.avatar}>{me.name?.trim()[0]?.toUpperCase() ?? 'U'}</div>
              )}
              <div className={styles.userMeta}>
                <p className={styles.displayName}>{me.name}</p>
                <p className={styles.handle}>{handle}</p>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <CharacterAvatar character={character} size="md" />
            <p className={styles.levelTitle}>Level {progress.level}</p>
            <div className={styles.progressHead}>
              <span className={styles.progressHeadLeft}>XP to Level {progress.level + 1}</span>
              <span className={styles.progressHeadRight}>
                {progress.xp} / {xpCeiling}
              </span>
            </div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${xpBarPct}%` }} />
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.quickTitle}>Quick Stats</h2>
            <div className={styles.quickRow}>
              <div className={styles.quickIcon}>
                <IconBolt />
              </div>
              <div className={styles.quickMeta}>
                <p className={styles.quickLabel}>Total XP</p>
                <p className={styles.quickValue}>{progress.xp.toLocaleString()}</p>
              </div>
            </div>
            <div className={styles.quickRow}>
              <div className={styles.quickIcon}>
                <IconTargetSmall />
              </div>
              <div className={styles.quickMeta}>
                <p className={styles.quickLabel}>Total Sessions</p>
                <p className={styles.quickValue}>{stats.totalSessions.toLocaleString()}</p>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.streakRow}>
            <article className={`${styles.card} ${styles.streakCard}`}>
              <div className={styles.streakTop}>
                <div className={styles.streakIconPurple}>
                  <IconFlame />
                </div>
                <div>
                  <p className={styles.streakLabel}>Current Streak</p>
                  <p className={styles.streakValue}>{progress.streak} days</p>
                </div>
              </div>
            </article>
            <article className={`${styles.card} ${styles.streakCard}`}>
              <div className={styles.streakTop}>
                <div className={styles.streakIconMuted}>
                  <IconTrophy />
                </div>
                <div>
                  <p className={styles.streakLabel}>Best Streak</p>
                  <p className={styles.streakValue}>{bestStreakDays} days</p>
                </div>
              </div>
            </article>
          </div>

          <section className={styles.card}>
            <h2 className={styles.achHead}>
              <IconRibbon />
              Achievements
            </h2>
            <div className={styles.achList}>
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={`${styles.achItem} ${a.unlocked ? '' : styles.achItemLocked}`}
                >
                  <div className={a.unlocked ? styles.achTrophyOn : styles.achTrophyOff}>
                    <IconTrophy />
                  </div>
                  <div className={styles.achBody}>
                    <p className={styles.achTitle}>{a.title}</p>
                    <p className={styles.achDesc}>{a.description}</p>
                  </div>
                  {a.unlocked ? <span className={styles.unlockedBadge}>Unlocked</span> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <article className={`${styles.card} ${styles.bottomCard}`}>
          <p className={styles.bottomLabel}>Total Focus Time</p>
          <p className={styles.bottomValue}>{totalFocusHoursLabel(stats.totalFocusMinutes)}</p>
        </article>
        <article className={`${styles.card} ${styles.bottomCard}`}>
          <p className={styles.bottomLabel}>Average per Day</p>
          <p className={styles.bottomValue}>{avgLabel}</p>
        </article>
        <article className={`${styles.card} ${styles.bottomCard}`}>
          <p className={styles.bottomLabel}>Member Since</p>
          <p className={styles.bottomValue}>{memberSinceLabel(me.createdAt)}</p>
        </article>
      </div>
    </div>
  );
}
