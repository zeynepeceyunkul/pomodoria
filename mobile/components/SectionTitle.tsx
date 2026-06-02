import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';

type Props = { children: string };

export function SectionTitle({ children }: Props) {
  const c = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        t: {
          fontSize: 18,
          fontWeight: '700',
          color: c.text,
          marginBottom: 16,
        },
      }),
    [c],
  );
  return <Text style={styles.t}>{children}</Text>;
}
