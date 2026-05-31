export const AUTH_TOKEN_KEY = 'pomodoria_token';

/**
 * Default matches local backend. Override with EXPO_PUBLIC_API_URL.
 * - Android emulator: often `http://10.0.2.2:5000`
 * - Physical device: your machine's LAN IP, e.g. `http://192.168.1.10:5000`
 */
export function getApiBase(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';
  return raw.replace(/\/$/, '');
}
