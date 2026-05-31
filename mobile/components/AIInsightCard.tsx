import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../constants/theme';

type Props = {
  title?: string;
  message: string;
};

/** Lightweight insight chip — UI only; copy can be heuristic/static. */
export function AIInsightCard({ title = 'Insight', message }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.miniBg,
    borderWidth: 1,
    borderColor: colors.miniBorder,
    borderRadius: radii.sm + 4,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.insightText,
  },
});
