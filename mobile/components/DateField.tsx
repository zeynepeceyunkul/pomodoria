import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { radii } from '../constants/theme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { ThemeColors } from '../hooks/useThemeColors';

type Props = {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  onClear?: () => void;
  placeholder?: string;
};

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DateField({ label, value, onChange, onClear, placeholder = 'No date' }: Props) {
  const styles = useThemedStyles(createDateFieldStyles);
  const [open, setOpen] = useState(false);
  const date = parseYmd(value) ?? new Date();

  function onPickerChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (selected) onChange(formatYmd(selected));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => setOpen(true)}>
          <Text style={styles.btnText}>{value || placeholder}</Text>
        </Pressable>
        {value && onClear ? (
          <Pressable onPress={onClear} style={styles.clear}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Pressable onPress={() => setOpen(false)} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createDateFieldStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: c.textMuted, marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    btn: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.miniBorder,
      borderRadius: radii.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.surface,
    },
    btnText: { fontSize: 16, color: c.text },
    clear: { paddingVertical: 8, paddingHorizontal: 4 },
    clearText: { color: c.link, fontWeight: '700', fontSize: 14 },
    done: { alignSelf: 'flex-end', marginTop: 8, padding: 8 },
    doneText: { color: c.link, fontWeight: '700' },
  });
