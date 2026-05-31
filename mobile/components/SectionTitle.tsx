import { StyleSheet, Text } from 'react-native';
import { colors } from '../constants/theme';

type Props = { children: string };

export function SectionTitle({ children }: Props) {
  return <Text style={styles.t}>{children}</Text>;
}

const styles = StyleSheet.create({
  t: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
});
