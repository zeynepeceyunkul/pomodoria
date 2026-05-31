import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getMe } from '../api/users';
import { AuthHttpError } from '../api/http';
import type { MeResponse } from '../api/users';
import { logoutRequest } from '../api/auth';
import { clearStoredToken, getStoredRefreshToken, getStoredToken } from '../auth/token';
import { applyHtmlTheme } from '../lib/theme';
import type { AppOutletContext } from './outletContext';
import { PomodoroTimerProvider } from '../timer/PomodoroTimerContext';
import styles from './MainLayout.module.css';

function avatarLetter(name: string | undefined): string {
  const t = name?.trim();
  if (!t) return 'U';
  return t[0]!.toUpperCase();
}

export function MainLayout() {
  const navigate = useNavigate();
  const token = getStoredToken();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(token));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await getMe();
        if (!cancelled) setMe(profile);
      } catch (e) {
        if (!cancelled && e instanceof AuthHttpError && e.status === 401) {
          navigate('/login', { replace: true });
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await getMe();
      setMe(profile);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        navigate('/login', { replace: true });
      }
    }
  }, [token, navigate]);

  useEffect(() => {
    applyHtmlTheme(me?.settings?.theme);
  }, [me?.settings?.theme]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await logoutRequest(getStoredRefreshToken());
    clearStoredToken();
    navigate('/login', { replace: true });
  }

  if (!token) return null;

  const outletCtx: AppOutletContext = { me, loadingProfile, refreshMe };

  return (
    <div className={`${styles.shell} layout-shell`}>
      <header className={`${styles.header} layout-header`}>
        <NavLink className={`${styles.logo} layout-logo`} to="/dashboard">
          Pomodoria
        </NavLink>

        <nav className={`${styles.nav} layout-nav`} aria-label="Primary">
          <NavLink
            className={({ isActive }) =>
              `${isActive ? styles.navActive : styles.navLink} ${isActive ? 'layout-nav-active' : 'layout-nav-link'}`
            }
            to="/dashboard"
          >
            Dashboard
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `${isActive ? styles.navActive : styles.navLink} ${isActive ? 'layout-nav-active' : 'layout-nav-link'}`
            }
            to="/focus"
          >
            Focus
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `${isActive ? styles.navActive : styles.navLink} ${isActive ? 'layout-nav-active' : 'layout-nav-link'}`
            }
            to="/statistics"
          >
            Statistics
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `${isActive ? styles.navActive : styles.navLink} ${isActive ? 'layout-nav-active' : 'layout-nav-link'}`
            }
            to="/history"
          >
            History
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `${isActive ? styles.navActive : styles.navLink} ${isActive ? 'layout-nav-active' : 'layout-nav-link'}`
            }
            to="/profile"
          >
            Profile
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `${isActive ? styles.navActive : styles.navLink} ${isActive ? 'layout-nav-active' : 'layout-nav-link'}`
            }
            to="/settings"
          >
            Settings
          </NavLink>
        </nav>

        <div className={styles.userBlock} ref={menuRef}>
          <span className={`${styles.userName} layout-user-name`} title={me?.name}>
            {loadingProfile ? '…' : (me?.name ?? '')}
          </span>
          <button
            type="button"
            className={`${styles.avatarBtn} ${loadingProfile ? styles.avatarMuted : ''}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            disabled={loadingProfile}
          >
            <span className={styles.avatar}>
              {loadingProfile ? '…' : avatarLetter(me?.name)}
            </span>
          </button>
          {menuOpen ? (
            <div className={styles.userMenu} role="menu">
              <NavLink
                className={styles.menuItem}
                to="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </NavLink>
              <NavLink
                className={styles.menuItem}
                to="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </NavLink>
              <button type="button" className={styles.menuItemDanger} role="menuitem" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className={`${styles.main} layout-main`}>
        <PomodoroTimerProvider
          userId={me?._id ?? ''}
          focusMinutes={me?.settings?.focusDuration ?? 25}
          breakMinutes={me?.settings?.breakDuration ?? 5}
          longBreakMinutes={me?.settings?.longBreakDuration ?? 15}
          sessionsUntilLongBreak={me?.settings?.sessionsUntilLongBreak ?? 4}
          prefs={{
            notifySessionReminders: me?.settings?.notifySessionReminders !== false,
            notifyBreakReminders: me?.settings?.notifyBreakReminders !== false,
            notifyAchievements: me?.settings?.notifyAchievements !== false,
            soundEffects: me?.settings?.soundEffects === true,
            autoStartSessions: me?.settings?.autoStartSessions !== false,
          }}
        >
          <Outlet context={outletCtx} />
        </PomodoroTimerProvider>
      </main>
    </div>
  );
}
