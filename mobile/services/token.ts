import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_TOKEN_KEY } from './config';

export const AUTH_REFRESH_KEY = 'pomodoria_refresh_token';

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_REFRESH_KEY);
}

export async function setStoredTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, accessToken],
    [AUTH_REFRESH_KEY, refreshToken],
  ]);
}

export async function setStoredToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_REFRESH_KEY]);
}
