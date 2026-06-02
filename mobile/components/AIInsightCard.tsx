import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';

type Props = {
  title?: string;
  message: string;
};

/** Lightweight insight chip fed by user analytics. */
export function AIInsightCard({ title = 'Insight', message }: Props) {
  const c = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: c.miniBg,
          borderWidth: 1,
          borderColor: c.miniBorder,
          borderRadius: radii.sm + 4,
          padding: 16,
          marginBottom: 12,
        },
        title: {
          fontSize: 13,
          fontWeight: '700',
          color: c.textSecondary,
          marginBottom: 8,
        },
        body: {
          fontSize: 15,
          lineHeight: 22,
          color: c.insightText,
        },
      }),
    [c],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
    </View>
  );
}
