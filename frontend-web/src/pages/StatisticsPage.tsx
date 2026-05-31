import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { AuthHttpError } from '../api/http';
import { getSessionAnalytics, getSessionStats } from '../api/sessions';
import type { SessionAnalyticsResponse, SessionStatsResponse } from '../api/sessions';
import { formatMinutes } from '../lib/sessionAggregate';
import styles from './StatisticsPage.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const ACCENT = '#583d5a';
const ACCENT_FILL = 'rgba(88, 61, 90, 0.22)';
const GRID = '#e5e7eb';

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconTarget({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

function IconTrend({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 16l5-5 4 4 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 8h4v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function shortDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function StatisticsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [analytics, setAnalytics] = useState<SessionAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, an] = await Promise.all([getSessionStats(), getSessionAnalytics()]);
      setStats(st);
      setAnalytics(an);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load statistics.');
      setStats(null);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const chartCommonOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context: { parsed: { y?: number | null } }) {
              const y = context.parsed.y;
              const v = typeof y === 'number' ? y : 0;
              return `${Math.round(v)} min`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#6b7280', font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: GRID },
          ticks: {
            color: '#6b7280',
            font: { size: 11 },
            callback: (value: string | number) => `${value}m`,
          },
        },
      },
    }),
    [],
  );

  const weekBarData = useMemo(() => {
    if (!analytics) return null;
    return {
      labels: analytics.thisWeekDaily.map((d) => d.label),
      datasets: [
        {
          label: 'Focus minutes',
          data: analytics.thisWeekDaily.map((d) => d.focusMinutes),
          backgroundColor: ACCENT_FILL,
          borderColor: ACCENT,
          borderWidth: 1.5,
          borderRadius: 8,
          maxBarThickness: 36,
        },
      ],
    };
  }, [analytics]);

  const weekLineData = useMemo(() => {
    if (!analytics) return null;
    return {
      labels: analytics.last7Days.map((d) => shortDayLabel(d.date)),
      datasets: [
        {
          label: 'Focus minutes',
          data: analytics.last7Days.map((d) => d.focusMinutes),
          borderColor: ACCENT,
          backgroundColor: ACCENT_FILL,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: ACCENT,
        },
      ],
    };
  }, [analytics]);

  const insightsText = useMemo(() => {
    if (!stats || !analytics) return '';
    const bestDay = analytics.mostProductiveWeekday;
    const peakWeekMinutes = Math.max(...analytics.thisWeekDaily.map((d) => d.focusMinutes), 0);
    const peakWeekDay =
      peakWeekMinutes > 0
        ? analytics.thisWeekDaily.find((d) => d.focusMinutes === peakWeekMinutes)?.label
        : null;
    const parts: string[] = [];
    parts.push(
      `You have logged ${stats.completedFocusSessions} completed focus sessions (${formatMinutes(stats.totalFocusMinutes)} total focus time).`,
    );
    if (analytics.todayFocusMinutes > 0) {
      parts.push(`Today you have recorded ${formatMinutes(analytics.todayFocusMinutes)} of focus time.`);
    }
    if (bestDay) {
      parts.push(`Across all time, most focus minutes fall on ${bestDay}s.`);
    }
    if (peakWeekDay && peakWeekMinutes > 0) {
      parts.push(`This calendar week (UTC), your busiest day so far is ${peakWeekDay} (${formatMinutes(peakWeekMinutes)}).`);
    }
    return parts.join(' ');
  }, [stats, analytics]);

  if (loading && !stats && !analytics) {
    return (
      <div className={styles.loading} aria-busy="true">
        Loading statistics…
      </div>
    );
  }

  if (error && !stats && !analytics) {
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

  if (!stats || !analytics) return null;

  const focusFormatted = formatMinutes(stats.totalFocusMinutes);
  const xpFormatted = `${stats.totalXpEarned.toLocaleString()} XP`;
  const bestStreakLabel =
    analytics.longestStreak > 0 ? `${analytics.longestStreak} days` : '—';

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Statistics</h1>

      <div className={styles.grid4}>
        <article className={styles.statCard}>
          <IconClock className={styles.statIcon} />
          <p className={styles.statLabel}>Total Focus Time</p>
          <p className={styles.statValue}>{focusFormatted}</p>
          <p className={styles.statSub}>Completed focus sessions</p>
        </article>

        <article className={styles.statCard}>
          <IconTarget className={styles.statIcon} />
          <p className={styles.statLabel}>Completed Sessions</p>
          <p className={styles.statValue}>{stats.completedFocusSessions}</p>
          <p className={styles.statSub}>Successfully finished pomodoros</p>
        </article>

        <article className={styles.statCard}>
          <IconTrend className={styles.statIcon} />
          <p className={styles.statLabel}>Today (UTC)</p>
          <p className={styles.statValue}>{formatMinutes(analytics.todayFocusMinutes)}</p>
          <p className={styles.statSub}>Focus minutes logged today</p>
        </article>

        <article className={styles.statCard}>
          <IconCalendar className={styles.statIcon} />
          <p className={styles.statLabel}>Best Streak</p>
          <p className={styles.statValue}>{bestStreakLabel}</p>
          <p className={styles.statSub}>Longest daily chain</p>
        </article>
      </div>

      <div className={styles.grid2}>
        <section className={styles.chartCard}>
          <h2 className={styles.chartTitle}>This week — focus minutes by day (UTC)</h2>
          <div className={styles.chartCanvas}>
            {weekBarData ? <Bar options={chartCommonOpts} data={weekBarData} /> : null}
          </div>
        </section>

        <section className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Last 7 days — focus trend (UTC)</h2>
          <div className={styles.chartCanvas}>
            {weekLineData ? <Line options={chartCommonOpts} data={weekLineData} /> : null}
          </div>
        </section>
      </div>

      <div className={styles.grid3}>
        <article className={styles.metricCard}>
          <p className={styles.statLabel}>Most Productive Day</p>
          <p className={styles.statValue}>{analytics.mostProductiveWeekday ?? '—'}</p>
          <p className={styles.statSub}>By total focus minutes (all time)</p>
        </article>
        <article className={styles.metricCard}>
          <p className={styles.statLabel}>Current Streak</p>
          <p className={styles.statValue}>{analytics.currentStreak} days</p>
          <p className={styles.statSub}>UTC calendar · Profile syncs on save</p>
        </article>
        <article className={styles.metricCard}>
          <p className={styles.statLabel}>Total XP Earned</p>
          <p className={styles.statValue}>{xpFormatted}</p>
          <p className={styles.statSub}>From logged sessions</p>
        </article>
      </div>

      <section className={styles.aiCard}>
        <h2 className={styles.aiTitle}>Insights</h2>
        <p className={styles.aiText}>{insightsText}</p>
      </section>
    </div>
  );
}
