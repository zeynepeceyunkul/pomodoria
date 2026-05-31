/* One-off smoke test — run: node scripts/smoke-api.js */
const base = process.env.API_BASE || 'http://127.0.0.1:5000';

async function main() {
  const ts = Date.now();
  const username = `mob${ts}`;
  const email = `mob${ts}@expo.test`;
  const password = 'ExpoTest123!';

  const regRes = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const regText = await regRes.text();
  if (!regRes.ok) {
    console.error('REGISTER FAIL', regRes.status, regText);
    process.exit(1);
  }
  const { token } = JSON.parse(regText);
  console.log('[OK] register + token');

  const startTime = new Date(Date.now() - 25 * 60_000).toISOString();
  const endTime = new Date().toISOString();
  const sessRes = await fetch(`${base}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: 'focus',
      duration: 25,
      startTime,
      endTime,
      completed: true,
    }),
  });
  const sessText = await sessRes.text();
  if (!sessRes.ok) {
    console.error('SESSION POST FAIL', sessRes.status, sessText);
    process.exit(1);
  }
  const session = JSON.parse(sessText);
  console.log('[OK] session saved', session._id);

  const meRes = await fetch(`${base}/api/sessions/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await meRes.json();
  if (!meRes.ok || !Array.isArray(list)) {
    console.error('SESSIONS ME FAIL', meRes.status, list);
    process.exit(1);
  }
  console.log('[OK] sessions/me count:', list.length, 'latest type:', list[0]?.type);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
