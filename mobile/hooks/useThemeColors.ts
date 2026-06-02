import { useMemo } from 'react';
import { getThemeColors, type darkColors, type lightColors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export type ThemeColors = typeof lightColors | typeof darkColors;

export function useThemeColors(): ThemeColors {
  const { settings } = useAuth();
  return useMemo(() => getThemeColors(settings?.theme), [settings?.theme]);
}

export function useIsDarkTheme() {
  const { settings } = useAuth();
  return settings?.theme === 'dark';
}
