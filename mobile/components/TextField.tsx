import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { radii } from '../constants/theme';
import { useThemeColors } from '../hooks/useThemeColors';

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  editable?: boolean;
  error?: string | null;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  error,
}: Props) {
  const c = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: 18 },
        label: { marginBottom: 8, fontSize: 14, fontWeight: '500', color: c.textSoft },
        input: {
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radii.sm,
          paddingVertical: 12,
          paddingHorizontal: 14,
          fontSize: 16,
          color: c.text,
          backgroundColor: c.surface,
        },
        inputInvalid: { borderColor: c.errorBorder },
        err: { marginTop: 6, fontSize: 13, color: c.errorText },
      }),
    [c],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        secureTextEntry={Boolean(secureTextEntry)}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable !== false}
        style={[styles.input, error ? styles.inputInvalid : null]}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}
