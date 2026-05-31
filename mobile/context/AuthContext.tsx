import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  loginRequest,
  logoutRequest,
  registerRequest,
  type AuthSuccessResponse,
  type RegisterResponse,
} from '../services/auth';
import { AuthHttpError } from '../services/http';
import {
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredTokens,
} from '../services/token';
import { getMe, getSettings, type MeResponse, type SettingsResponse } from '../services/users';

type AuthContextValue = {
  token: string | null;
  user: MeResponse | null;
  settings: SettingsResponse | null;
  bootstrapping: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<RegisterResponse>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthUserToMe(res: AuthSuccessResponse): MeResponse {
  const u = res.user;
  return {
    _id: u.id,
    name: u.name,
    email: u.email,
    level: u.level,
    xp: u.xp,
    streak: u.streak,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const applyAuthSuccess = useCallback(async (res: AuthSuccessResponse) => {
    await setStoredTokens(res.token, res.refreshToken);
    setToken(res.token);
    setUser(mapAuthUserToMe(res));
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      /* keep mapped user from login payload */
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const me = await getMe();
      setUser(me);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await clearStoredToken();
        setToken(null);
        setUser(null);
        setSettings(null);
      }
    }
  }, [token]);

  const refreshSettings = useCallback(async () => {
    if (!token) return;
    try {
      const s = await getSettings();
      setSettings(s);
    } catch (e) {
      if (e instanceof AuthHttpError && e.status === 401) {
        await clearStoredToken();
        setToken(null);
        setUser(null);
        setSettings(null);
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setSettings(null);
      return;
    }
    void refreshSettings();
  }, [token, refreshSettings]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const t = await getStoredToken();
        if (cancelled) return;
        if (!t) {
          setBootstrapping(false);
          return;
        }
        setToken(t);
        try {
          const me = await getMe();
          if (!cancelled) setUser(me);
        } catch (e) {
          if (!cancelled) {
            if (e instanceof AuthHttpError && e.status === 401) {
              await clearStoredToken();
              setToken(null);
              setUser(null);
            }
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await loginRequest(email, password);
      await applyAuthSuccess(res);
    },
    [applyAuthSuccess],
  );

  const signUp = useCallback(async (username: string, email: string, password: string) => {
    return registerRequest(username, email, password);
  }, []);

  const signOut = useCallback(async () => {
    await logoutRequest(await getStoredRefreshToken());
    await clearStoredToken();
    setToken(null);
    setUser(null);
    setSettings(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      settings,
      bootstrapping,
      signIn,
      signUp,
      signOut,
      refreshUser,
      refreshSettings,
    }),
    [token, user, settings, bootstrapping, signIn, signUp, signOut, refreshUser, refreshSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
