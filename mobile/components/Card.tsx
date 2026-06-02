import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useIsDarkTheme } from '../hooks/useThemeColors';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style }: Props) {
  const c = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: c.surface,
          borderRadius: radii.card,
          paddingVertical: 22,
          paddingHorizontal: 20,
          ...(isDark
            ? {
                borderWidth: 1,
                borderColor: c.border,
              }
            : {}),
        },
      }),
    [c, isDark],
  );

  const shadowStyle = isDark
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 3,
      }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      };

  return <View style={[styles.card, shadowStyle, style]}>{children}</View>;
}
