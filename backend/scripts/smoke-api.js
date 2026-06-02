/* Smoke test — requires running API. Usage: node scripts/smoke-api.js */
const base = process.env.API_BASE || 'http://127.0.0.1:5000';

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  return { res, data, text };
}

async function get(path, token) {
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  return { res, data };
}

async function put(path, body, token) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const res = await fetch(`${base}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  return { res, data, text };
}

async function patch(path, body, token) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const res = await fetch(`${base}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  return { res, data, text };
}

async function main() {
  const ts = Date.now();
  const username = `smoke${ts}`;
  const email = `smoke${ts}@test.local`;
  const password = 'SmokeTest123!';

  const { res: regRes, data: regData, text: regText } = await post('/api/auth/register', {
    username,
    email,
    password,
  });
  if (!regRes.ok || !regData.requiresEmailVerification) {
    console.error('REGISTER FAIL', regRes.status, regText);
    process.exit(1);
  }
  console.log('[OK] register (email verification required)');

  await post('/api/auth/verify-email', { token: 'invalid' });

  const user = await (async () => {
    const mongoose = require('mongoose');
    require('dotenv').config();
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pomodoria');
    const User = require('../src/models/User');
    const u = await User.findOne({ email: email.toLowerCase() });
    if (u) {
      u.emailVerified = true;
      await u.save();
    }
    await mongoose.disconnect();
    return u;
  })().catch(() => null);

  if (!user) {
    console.log('[SKIP] could not auto-verify user — set emailVerified manually in DB for full smoke');
    process.exit(0);
  }

  const { res: loginRes, data: loginData, text: loginText } = await post('/api/auth/login', {
    email,
    password,
  });
  if (!loginRes.ok || !loginData.token) {
    console.error('LOGIN FAIL', loginRes.status, loginText);
    process.exit(1);
  }
  const token = loginData.token;
  console.log('[OK] login');

  const startTime = new Date(Date.now() - 25 * 60_000).toISOString();
  const { res: sessRes, data: sessData, text: sessText } = await post(
    '/api/sessions',
    {
      type: 'focus',
      duration: 25,
      startTime,
      endTime: new Date().toISOString(),
      completed: true,
    },
    token,
  );
  if (!sessRes.ok) {
    console.error('SESSION FAIL', sessRes.status, sessText);
    process.exit(1);
  }
  console.log('[OK] session saved', sessData.session?._id ?? sessData._id);

  const { res: tasksRes, data: taskData } = await post(
    '/api/tasks',
    { title: 'Smoke task' },
    token,
  );
  if (!tasksRes.ok) {
    console.error('TASK FAIL', tasksRes.status, taskData);
    process.exit(1);
  }
  console.log('[OK] task created', taskData._id);

  const taskId = taskData._id;
  const { res: putRes, data: putData, text: putText } = await put(
    `/api/tasks/${taskId}`,
    { title: 'Smoke task updated', dueDate: new Date().toISOString() },
    token,
  );
  if (!putRes.ok || putData.title !== 'Smoke task updated') {
    console.error('TASK PUT FAIL', putRes.status, putText);
    process.exit(1);
  }
  console.log('[OK] task updated');

  const { res: analyticsRes, data: analyticsData } = await get('/api/sessions/analytics', token);
  if (!analyticsRes.ok || !Array.isArray(analyticsData.last30DaysXp)) {
    console.error('ANALYTICS FAIL', analyticsRes.status, analyticsData);
    process.exit(1);
  }
  console.log('[OK] session analytics', analyticsData.last30DaysXp.length, 'days');

  const { res: profileRes, data: profileData, text: profileText } = await patch(
    '/api/users/me',
    { name: 'Smoke Tester' },
    token,
  );
  if (!profileRes.ok || profileData.name !== 'Smoke Tester') {
    console.error('PROFILE PATCH FAIL', profileRes.status, profileText);
    process.exit(1);
  }
  console.log('[OK] profile updated');

  const { res: meRes, data: meData } = await get('/api/users/me', token);
  if (!meRes.ok || !meData.character) {
    console.error('ME FAIL', meRes.status, meData);
    process.exit(1);
  }
  console.log('[OK] profile + character', meData.character.stageName);

  const { res: forgotRes, data: forgotData } = await post('/api/auth/forgot-password', { email });
  if (!forgotRes.ok) {
    console.error('FORGOT PASSWORD FAIL', forgotRes.status, forgotData);
    process.exit(1);
  }
  console.log('[OK] forgot-password');

    const resetToken = await (async () => {
      const mongoose = require('mongoose');
      const { hashToken, generateSecureToken } = require('../src/utils/tokenHash');
      require('dotenv').config();
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pomodoria');
      const User = require('../src/models/User');
      const u = await User.findOne({ email: email.toLowerCase() });
      const raw = generateSecureToken();
      if (u) {
        u.passwordResetTokenHash = hashToken(raw);
        u.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
        await u.save();
      }
      await mongoose.disconnect();
      return raw;
    })().catch(() => null);

  if (resetToken) {
    const newPassword = 'SmokeReset456!';
    const { res: resetRes, data: resetData } = await post('/api/auth/reset-password', {
      token: resetToken,
      password: newPassword,
    });
    if (!resetRes.ok) {
      console.error('RESET PASSWORD FAIL', resetRes.status, resetData);
      process.exit(1);
    }
    const { res: reloginRes, data: reloginData } = await post('/api/auth/login', {
      email,
      password: newPassword,
    });
    if (!reloginRes.ok || !reloginData.token) {
      console.error('RELOGIN AFTER RESET FAIL', reloginRes.status, reloginData);
      process.exit(1);
    }
    console.log('[OK] reset-password + relogin');
  } else {
    console.log('[SKIP] reset-password (could not seed token in DB)');
  }

  console.log('[DONE] smoke test passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
