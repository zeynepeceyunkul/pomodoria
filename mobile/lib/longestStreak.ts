import type { SessionRecord } from '../services/sessions';

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): Date {
  const [y, mo, day] = key.split('-').map(Number);
  return new Date(y!, mo! - 1, day!);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

export function longestCompletedFocusStreakDays(sessions: SessionRecord[]): number {
  const keys = new Set<string>();
  for (const s of sessions) {
    if (s.type !== 'focus' || !s.completed) continue;
    keys.add(localDayKey(new Date(s.startTime)));
  }
  const sorted = [...keys].sort();
  if (sorted.length === 0) return 0;

  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseKey(sorted[i - 1]!);
    const next = parseKey(sorted[i]!);
    if (daysBetween(prev, next) === 1) cur++;
    else cur = 1;
    best = Math.max(best, cur);
  }
  return best;
}
