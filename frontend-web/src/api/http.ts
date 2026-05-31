import { refreshTokenRequest } from './auth';
import {
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredTokens,
} from '../auth/token';

const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export class AuthHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthHttpError';
    this.status = status;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const tokens = await refreshTokenRequest(refresh);
        setStoredTokens(tokens.token, tokens.refreshToken);
        return true;
      } catch {
        clearStoredToken();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export async function authFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = getStoredToken();
  if (!token) {
    throw new AuthHttpError('Not authenticated', 401);
  }

  const url = path.startsWith('http') ? path : `${apiBase().replace(/\/$/, '')}${path}`;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body != null && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !retried) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return authFetch(path, init, true);
    }
    clearStoredToken();
    throw new AuthHttpError('Session expired. Please sign in again.', 401);
  }

  return res;
}

function readErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof (data as { message: unknown }).message === 'string'
  ) {
    return (data as { message: string }).message;
  }
  return fallback;
}

async function handleAuthResponse<T>(res: Response): Promise<T> {
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }

  if (res.status === 401) {
    clearStoredToken();
    throw new AuthHttpError(readErrorMessage(data, 'Session expired. Please sign in again.'), 401);
  }

  if (!res.ok) {
    throw new AuthHttpError(readErrorMessage(data, `Request failed (${res.status})`), res.status);
  }

  return data as T;
}

export async function authGetJson<T>(path: string): Promise<T> {
  try {
    const res = await authFetch(path, { method: 'GET' });
    return handleAuthResponse<T>(res);
  } catch (e) {
    if (e instanceof AuthHttpError) throw e;
    throw new Error('Cannot reach the server. Is the API running?');
  }
}

export async function authPostJson<T>(path: string, body: unknown): Promise<T> {
  try {
    const res = await authFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return handleAuthResponse<T>(res);
  } catch (e) {
    if (e instanceof AuthHttpError) throw e;
    throw new Error('Cannot reach the server. Is the API running?');
  }
}

export async function authPutJson<T>(path: string, body: unknown): Promise<T> {
  try {
    const res = await authFetch(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return handleAuthResponse<T>(res);
  } catch (e) {
    if (e instanceof AuthHttpError) throw e;
    throw new Error('Cannot reach the server. Is the API running?');
  }
}
