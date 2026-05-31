import type { SessionRecord } from '../services/sessions';

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfLocalWeek(d: Date): Date {
  const sod = startOfLocalDay(d);
  const day = sod.getDay();
  const diffToMonday = (day + 6) % 7;
  return addDays(sod, -diffToMonday);
}

function endOfRange(start: Date): Date {
  const e = new Date(start);
  e.setDate(e.getDate() + 7);
  return e;
}

function inRange(iso: string, start: Date, endExclusive: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < endExclusive.getTime();
}

const focusDone = (s: SessionRecord) => s.type === 'focus' && s.completed;

export type AggregatedRanges = {
  todaySessions: number;
  yesterdaySessions: number;
  todayMinutes: number;
  todayXp: number;
  weekSessions: number;
  weekMinutes: number;
  weekXp: number;
};

export function aggregateSessionRanges(sessions: SessionRecord[], now = new Date()): AggregatedRanges {
  const todayStart = startOfLocalDay(now);
  const todayEnd = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);

  const weekStart = startOfLocalWeek(now);
  const weekEnd = endOfRange(weekStart);

  const todayList = sessions.filter((s) => focusDone(s) && inRange(s.startTime, todayStart, todayEnd));
  const yesterdayList = sessions.filter(
    (s) => focusDone(s) && inRange(s.startTime, yesterdayStart, todayStart),
  );
  const weekList = sessions.filter((s) => focusDone(s) && inRange(s.startTime, weekStart, weekEnd));

  const sumDur = (arr: SessionRecord[]) => arr.reduce((acc, s) => acc + (s.duration ?? 0), 0);
  const sumXp = (arr: SessionRecord[]) => arr.reduce((acc, s) => acc + (s.xpEarned ?? 0), 0);

  return {
    todaySessions: todayList.length,
    yesterdaySessions: yesterdayList.length,
    todayMinutes: sumDur(todayList),
    todayXp: sumXp(todayList),
    weekSessions: weekList.length,
    weekMinutes: sumDur(weekList),
    weekXp: sumXp(weekList),
  };
}
