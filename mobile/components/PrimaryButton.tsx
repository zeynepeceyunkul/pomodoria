import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radii } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, disabled, loading, style }: Props) {
  const c = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          backgroundColor: c.primary,
          borderRadius: radii.sm,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: 'center',
          justifyContent: 'center',
        },
        btnPressed: { backgroundColor: c.primaryHover },
        btnDisabled: { opacity: 0.65 },
        label: { color: c.onPrimary, fontSize: 16, fontWeight: '600' },
      }),
    [c],
  );

  const inactive = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.btn,
        inactive ? styles.btnDisabled : null,
        pressed && !inactive ? styles.btnPressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.onPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}
