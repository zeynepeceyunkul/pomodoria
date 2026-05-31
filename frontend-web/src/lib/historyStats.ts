import type { SessionRecord } from '../api/sessions';

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfLocalWeekMonday(d: Date): Date {
  const sod = startOfLocalDay(d);
  const day = sod.getDay();
  const diffToMonday = (day + 6) % 7;
  sod.setDate(sod.getDate() - diffToMonday);
  return sod;
}

function startOfLocalMonth(d: Date): Date {
  const x = startOfLocalDay(d);
  x.setDate(1);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function isCompletedSession(s: SessionRecord): boolean {
  return Boolean(s.completed);
}

export function countCompletedInWeek(sessions: SessionRecord[], now = new Date()): number {
  const ws = startOfLocalWeekMonday(now);
  const we = new Date(ws);
  we.setDate(we.getDate() + 7);
  return sessions.filter(
    (s) => isCompletedSession(s) && inRangeStartTime(s, ws, we),
  ).length;
}

export function countCompletedInMonth(sessions: SessionRecord[], now = new Date()): number {
  const ms = startOfLocalMonth(now);
  const me = addMonths(ms, 1);
  return sessions.filter(
    (s) => isCompletedSession(s) && inRangeStartTime(s, ms, me),
  ).length;
}

export function countCompletedAllTime(sessions: SessionRecord[]): number {
  return sessions.filter(isCompletedSession).length;
}

function inRangeStartTime(s: SessionRecord, startInclusive: Date, endExclusive: Date): boolean {
  const t = new Date(s.startTime).getTime();
  return t >= startInclusive.getTime() && t < endExclusive.getTime();
}

export function sortSessionsNewestFirst(sessions: SessionRecord[]): SessionRecord[] {
  return [...sessions].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
}
