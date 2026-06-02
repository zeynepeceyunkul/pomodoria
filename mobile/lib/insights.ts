import type { SessionAnalyticsResponse, SessionStatsResponse } from '../services/sessions';
import { formatMinutes } from './formatMinutes';

export type InsightItem = {
  title: string;
  message: string;
  score: number;
};

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function buildInsights(
  stats: SessionStatsResponse,
  analytics: SessionAnalyticsResponse,
): InsightItem[] {
  const insights: InsightItem[] = [];
  const days = analytics.last7Days ?? [];
  const minutes = days.map((d) => d.focusMinutes);
  const activeDays = days.filter((d) => d.focusMinutes > 0).length;

  if (days.length >= 7) {
    const prev3 = average(minutes.slice(0, 3));
    const latest3 = average(minutes.slice(4, 7));
    if (latest3 >= prev3 + 10) {
      insights.push({
        title: 'Momentum up',
        message: `Last 3 days average ${formatMinutes(Math.round(latest3))}, higher than previous ${formatMinutes(Math.round(prev3))}.`,
        score: 95,
      });
    } else if (latest3 + 10 <= prev3) {
      insights.push({
        title: 'Momentum down',
        message: `Last 3 days average ${formatMinutes(Math.round(latest3))}, below previous ${formatMinutes(Math.round(prev3))}.`,
        score: 92,
      });
    }
  }

  insights.push({
    title: 'Consistency',
    message:
      activeDays >= 5
        ? `Focus logged on ${activeDays}/7 days.`
        : `Focus logged on ${activeDays}/7 days. Aim for 5+ active days.`,
    score: 90,
  });

  if (analytics.mostProductiveWeekday) {
    insights.push({
      title: 'Best weekday',
      message: `${analytics.mostProductiveWeekday} has the highest total focus minutes.`,
      score: 84,
    });
  }

  if (analytics.todayFocusMinutes === 0 && stats.completedFocusSessions > 0) {
    insights.push({
      title: 'Today starter',
      message: 'No focus logged today yet. One short session can keep your streak alive.',
      score: 91,
    });
  }

  return insights.sort((a, b) => b.score - a.score).slice(0, 3);
}
