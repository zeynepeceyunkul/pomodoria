import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SecondaryButton({ label, onPress, disabled, loading, style }: Props) {
  const c = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          backgroundColor: c.miniBg,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radii.sm,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 120,
        },
        pressed: { backgroundColor: c.miniBorder },
        disabled: { opacity: 0.55 },
        label: { color: c.text, fontSize: 16, fontWeight: '600' },
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
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}
