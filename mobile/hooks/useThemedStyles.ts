import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { type ThemeColors, useThemeColors } from './useThemeColors';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (c: ThemeColors) => T,
): T {
  const c = useThemeColors();
  return useMemo(() => StyleSheet.create(factory(c)), [c, factory]);
}
