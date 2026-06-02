import type { SessionAnalyticsResponse, SessionStatsResponse } from '../api/sessions';
import type { TaskStatsResponse } from '../api/tasks';
import { formatMinutes } from './sessionAggregate';

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
  taskStats?: TaskStatsResponse | null,
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
        message: `Last 3 days average ${formatMinutes(Math.round(latest3))}, up from ${formatMinutes(Math.round(prev3))}.`,
        score: 95,
      });
    } else if (latest3 + 10 <= prev3) {
      insights.push({
        title: 'Momentum down',
        message: `Last 3 days dropped to ${formatMinutes(Math.round(latest3))} from ${formatMinutes(Math.round(prev3))}.`,
        score: 92,
      });
    }
  }

  insights.push({
    title: 'Consistency',
    message:
      activeDays >= 5
        ? `Great consistency: focus logged on ${activeDays}/7 days.`
        : `Focus logged on ${activeDays}/7 days. Try to reach 5 active days.`,
    score: 90,
  });

  if (analytics.mostProductiveWeekday) {
    insights.push({
      title: 'Best day',
      message: `Your strongest weekday is ${analytics.mostProductiveWeekday}. Place deep work there.`,
      score: 82,
    });
  }

  if (taskStats) {
    const completionRate =
      taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
    insights.push({
      title: 'Task balance',
      message:
        taskStats.total === 0
          ? 'No tasks yet. Add a small task list for better focus planning.'
          : `${completionRate}% tasks completed (${taskStats.completed}/${taskStats.total}), ${taskStats.pending} pending.`,
      score: 88,
    });
  }

  if (analytics.todayFocusMinutes === 0 && stats.completedFocusSessions > 0) {
    insights.push({
      title: 'Today starter',
      message: 'No focus logged today yet. A single short session keeps your rhythm.',
      score: 91,
    });
  }

  return insights.sort((a, b) => b.score - a.score).slice(0, 3);
}
