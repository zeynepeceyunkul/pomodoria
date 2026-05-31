/** UTC calendar-day helpers so streak matches daily analytics buckets. */

function utcDayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function parseUtcDayKey(key) {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/**
 * Current streak: consecutive UTC days with ≥1 completed focus, anchored to today or yesterday.
 * @param {{ startTime: Date|string }[]} completedFocusSessions
 */
function currentStreakUtc(completedFocusSessions) {
  const keys = new Set(completedFocusSessions.map((s) => utcDayKey(s.startTime)));
  if (keys.size === 0) return 0;

  const today = utcDayKey(new Date());
  const yest = new Date();
  yest.setUTCDate(yest.getUTCDate() - 1);
  const yesterday = utcDayKey(yest);

  const anchorKey = keys.has(today) ? today : keys.has(yesterday) ? yesterday : null;
  if (!anchorKey) return 0;

  let streak = 0;
  const cursor = parseUtcDayKey(anchorKey);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!keys.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/**
 * Longest run of consecutive UTC days with ≥1 completed focus.
 * @param {{ startTime: Date|string }[]} completedFocusSessions
 */
function longestStreakUtc(completedFocusSessions) {
  const keys = [...new Set(completedFocusSessions.map((s) => utcDayKey(s.startTime)))].sort();
  if (keys.length === 0) return 0;

  let best = 1;
  let cur = 1;
  for (let i = 1; i < keys.length; i += 1) {
    const prev = parseUtcDayKey(keys[i - 1]);
    const next = parseUtcDayKey(keys[i]);
    const diffDays = Math.round((next.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) cur += 1;
    else cur = 1;
    best = Math.max(best, cur);
  }
  return best;
}

module.exports = {
  utcDayKey,
  currentStreakUtc,
  longestStreakUtc,
};
