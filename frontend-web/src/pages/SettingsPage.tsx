import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AuthHttpError } from '../api/http';
import { getMe, patchProfile, putSettings } from '../api/users';
import type { SettingsResponse, UserSettingsEmbedded } from '../api/users';
import { logoutRequest } from '../api/auth';
import { clearStoredToken, getStoredRefreshToken } from '../auth/token';
import { applyHtmlTheme } from '../lib/theme';
import { readAvatarDataUri } from '../lib/avatarImage';
import { ensureNotifyPermission } from '../lib/timerFx';
import type { AppOutletContext } from '../layout/outletContext';
import styles from './SettingsPage.module.css';

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light Mode' },
  { value: 'dark', label: 'Dark Mode' },
];

type Snapshot = {
  focusDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  theme: string;
  notifySessionReminders: boolean;
  notifyBreakReminders: boolean;
  notifyAchievements: boolean;
  soundEffects: boolean;
  autoStartSessions: boolean;
};

function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M14 20a2 2 0 01-4 0M18 8a6 6 0 10-12 0c0 4-2 5-2 5h16s-2-1-2-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 0112 21a9 9 0 019-9 5 5 0 01-.09 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Toggle({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy?: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  );
}

function normalizeEmbedded(s: UserSettingsEmbedded | undefined): Snapshot {
  return {
    focusDuration: typeof s?.focusDuration === 'number' ? s.focusDuration : 25,
    breakDuration: typeof s?.breakDuration === 'number' ? s.breakDuration : 5,
    longBreakDuration: typeof s?.longBreakDuration === 'number' ? s.longBreakDuration : 15,
    sessionsUntilLongBreak:
      typeof s?.sessionsUntilLongBreak === 'number' ? s.sessionsUntilLongBreak : 4,
    theme: (s?.theme || 'light').trim() || 'light',
    notifySessionReminders: s?.notifySessionReminders !== false,
    notifyBreakReminders: s?.notifyBreakReminders !== false,
    notifyAchievements: s?.notifyAchievements !== false,
    soundEffects: s?.soundEffects === true,
    autoStartSessions: s?.autoStartSessions !== false,
  };
}

function snapshotFromResponse(r: SettingsResponse): Snapshot {
  return {
    focusDuration: r.focusDuration,
    breakDuration: r.breakDuration,
    longBreakDuration: r.longBreakDuration,
    sessionsUntilLongBreak: r.sessionsUntilLongBreak,
    theme: (r.theme || 'light').trim() || 'light',
    notifySessionReminders: r.notifySessionReminders !== false,
    notifyBreakReminders: r.notifyBreakReminders !== false,
    notifyAchievements: r.notifyAchievements !== false,
    soundEffects: r.soundEffects === true,
    autoStartSessions: r.autoStartSessions !== false,
  };
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { me, refreshMe } = useOutletContext<AppOutletContext>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const snapshotRef = useRef<Snapshot | null>(null);

  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(4);
  const [theme, setTheme] = useState('light');

  const [sessionReminders, setSessionReminders] = useState(true);
  const [breakReminders, setBreakReminders] = useState(true);
  const [achievementNotifs, setAchievementNotifs] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);
  const [autoStartSessions, setAutoStartSessions] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const avatarInitialRef = useRef<string | null>(null);

  const applySnapshot = useCallback(() => {
    const s = snapshotRef.current;
    if (!s) return;
    setFocusDuration(s.focusDuration);
    setBreakDuration(s.breakDuration);
    setLongBreakDuration(s.longBreakDuration);
    setSessionsUntilLongBreak(s.sessionsUntilLongBreak);
    setTheme(s.theme);
    setSessionReminders(s.notifySessionReminders);
    setBreakReminders(s.notifyBreakReminders);
    setAchievementNotifs(s.notifyAchievements);
    setSoundEffects(s.soundEffects);
    setAutoStartSessions(s.autoStartSessions);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const profile = await getMe();
      setDisplayName(profile.name ?? '');
      setAvatarUri(profile.avatar ?? null);
      avatarInitialRef.current = profile.avatar ?? null;
      const snap = normalizeEmbedded(profile.settings);
      snapshotRef.current = snap;
      applySnapshot();
      applyHtmlTheme(snap.theme);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setLoadError(e instanceof Error ? e.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, [navigate, applySnapshot]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!successMsg) return;
    const id = window.setTimeout(() => setSuccessMsg(null), 5000);
    return () => window.clearTimeout(id);
  }, [successMsg]);

  async function handleSave() {
    setSaveError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const wantsNotify =
        sessionReminders || breakReminders || achievementNotifs;
      if (wantsNotify) {
        await ensureNotifyPermission();
      }

      const body = {
        focusDuration: clampInt(focusDuration, 1, 180),
        breakDuration: clampInt(breakDuration, 1, 60),
        theme: theme.trim() || 'light',
        longBreakDuration: clampInt(longBreakDuration, 1, 60),
        sessionsUntilLongBreak: clampInt(sessionsUntilLongBreak, 2, 10),
        notifySessionReminders: sessionReminders,
        notifyBreakReminders: breakReminders,
        notifyAchievements: achievementNotifs,
        soundEffects,
        autoStartSessions,
      };

      const updated: SettingsResponse = await putSettings(body);
      const snap = snapshotFromResponse(updated);
      snapshotRef.current = snap;
      applySnapshot();
      applyHtmlTheme(snap.theme);
      await refreshMe();
      if (displayName.trim() && displayName.trim() !== me?.name) {
        await patchProfile({ name: displayName.trim() });
        await refreshMe();
      }
      if (avatarUri !== avatarInitialRef.current) {
        await patchProfile({ avatar: avatarUri });
        avatarInitialRef.current = avatarUri;
        await refreshMe();
      }
      setSuccessMsg('Settings saved.');
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setSaveError(e instanceof Error ? e.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    applySnapshot();
    setSaveError(null);
    setSuccessMsg(null);
    setAvatarUri(avatarInitialRef.current);
  }

  async function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const uri = await readAvatarDataUri(file);
      setAvatarUri(uri);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not load image.');
    }
  }

  async function handleSignOut() {
    await logoutRequest(getStoredRefreshToken());
    clearStoredToken();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return (
      <div className={styles.loading} aria-busy="true">
        Loading settings…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Settings</h1>
        <div className={styles.errorBanner} role="alert">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      {successMsg ? (
        <div className={styles.successBanner} role="status">
          {successMsg}
        </div>
      ) : null}
      {saveError ? (
        <div className={styles.errorBanner} role="alert">
          {saveError}
        </div>
      ) : null}

      <div className={styles.stack}>
        <section className={styles.card} aria-labelledby="focus-settings-heading">
          <h2 id="focus-settings-heading" className={styles.cardHead}>
            <IconClock />
            Focus Settings
          </h2>

          <p className={styles.fieldHint}>
            Enter any duration in minutes (same as the mobile app). Focus: 1–180, breaks: 1–60, sessions until long break:
            2–10.
          </p>

          <div className={styles.grid2}>
            <TimerNumberField
              id="setting-focus"
              label="Focus duration (minutes)"
              value={focusDuration}
              onChange={setFocusDuration}
            />
            <TimerNumberField
              id="setting-break"
              label="Break duration (minutes)"
              value={breakDuration}
              onChange={setBreakDuration}
            />
          </div>

          <TimerNumberField
            id="setting-long-break"
            label="Long break duration (minutes)"
            value={longBreakDuration}
            onChange={setLongBreakDuration}
          />
          <p className={styles.fieldHint}>
            After every {sessionsUntilLongBreak} completed focus sessions, this longer break runs instead of the short
            break.
          </p>

          <TimerNumberField
            id="setting-sessions-until"
            label="Sessions until long break"
            value={sessionsUntilLongBreak}
            onChange={setSessionsUntilLongBreak}
          />

          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <p className={styles.toggleTitle} id="tog-auto-start-title">
                Auto-start sessions
              </p>
            </div>
            <Toggle
              checked={autoStartSessions}
              onChange={setAutoStartSessions}
              labelledBy="tog-auto-start-title"
            />
          </div>
        </section>

        <section className={styles.card} aria-labelledby="notifications-heading">
          <h2 id="notifications-heading" className={styles.cardHead}>
            <IconBell />
            Notifications
          </h2>

          <p className={styles.fieldHint}>
            Desktop alerts use your browser&apos;s notification permission. Saving with reminders enabled may prompt
            you to allow notifications.
          </p>

          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <p className={styles.toggleTitle} id="tog-session-title">
                Session Reminders
              </p>
            </div>
            <Toggle
              checked={sessionReminders}
              onChange={setSessionReminders}
              labelledBy="tog-session-title"
            />
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <p className={styles.toggleTitle} id="tog-break-title">
                Break Reminders
              </p>
            </div>
            <Toggle checked={breakReminders} onChange={setBreakReminders} labelledBy="tog-break-title" />
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <p className={styles.toggleTitle} id="tog-ach-title">
                Achievement Notifications
              </p>
            </div>
            <Toggle
              checked={achievementNotifs}
              onChange={setAchievementNotifs}
              labelledBy="tog-ach-title"
            />
          </div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <p className={styles.toggleTitle} id="tog-sound-title">
                Sound Effects
              </p>
            </div>
            <Toggle checked={soundEffects} onChange={setSoundEffects} labelledBy="tog-sound-title" />
          </div>
        </section>

        <section className={styles.card} aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className={styles.cardHead}>
            <IconMoon />
            Appearance
          </h2>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="setting-theme">
              Theme Preference
            </label>
            <select
              id="setting-theme"
              className={styles.select}
              value={THEME_OPTIONS.some((t) => t.value === theme) ? theme : theme || 'light'}
              onChange={(e) => setTheme(e.target.value)}
            >
              {theme && !THEME_OPTIONS.some((t) => t.value === theme) ? (
                <option value={theme}>{theme}</option>
              ) : null}
              {THEME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className={styles.fieldHint}>Applies to the signed-in app shell (header &amp; background).</p>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="account-heading">
          <h2 id="account-heading" className={styles.cardHead}>
            Account
          </h2>
          <div className={styles.field}>
            <span className={styles.label}>Profile photo</span>
            <div className={styles.avatarRow}>
              <div className={styles.avatarPreview} aria-hidden>
                {avatarUri ? (
                  <img src={avatarUri} alt="" className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {(displayName.trim()[0] ?? me?.name?.[0] ?? 'U').toUpperCase()}
                  </span>
                )}
              </div>
              <div className={styles.avatarActions}>
                <label className={styles.avatarUploadBtn}>
                  Choose photo
                  <input type="file" accept="image/*" className={styles.avatarFileInput} onChange={handleAvatarPick} />
                </label>
                {avatarUri ? (
                  <button type="button" className={styles.avatarRemoveBtn} onClick={() => setAvatarUri(null)}>
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="setting-name">
              Display name
            </label>
            <input
              id="setting-name"
              className={styles.numberInput}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              autoComplete="name"
            />
          </div>
          <p className={styles.fieldHint}>Sign out on this device. You can sign in again anytime.</p>
          <button type="button" className={styles.btnSignOut} onClick={handleSignOut}>
            Sign out
          </button>
        </section>

        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.btnPrimary} onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TimerNumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setText(next);
    const n = Number.parseInt(next, 10);
    if (Number.isFinite(n)) onChange(n);
  }

  function handleBlur() {
    const n = Number.parseInt(text, 10);
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    setText(String(n));
    onChange(n);
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.numberInput}
        type="number"
        inputMode="numeric"
        min={1}
        value={text}
        onChange={handleInput}
        onBlur={handleBlur}
      />
    </div>
  );
}
