import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CharacterState } from '../lib/characterEvolution';
import { useThemeColors } from '../hooks/useThemeColors';

type Props = {
  character: CharacterState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

const sizes = {
  sm: { box: 72, emoji: 32 },
  md: { box: 96, emoji: 42 },
  lg: { box: 120, emoji: 52 },
} as const;

export function CharacterAvatar({ character, size = 'md', showLabel = true }: Props) {
  const c = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center' },
        avatar: {
          backgroundColor: c.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        },
        emoji: { lineHeight: 52 },
        stageName: { fontSize: 16, fontWeight: '700', color: c.text },
        stageMeta: { fontSize: 12, color: c.textMuted, marginTop: 2, textAlign: 'center' },
      }),
    [c],
  );

  const dim = sizes[size];
  return (
    <View style={styles.wrap} accessibilityLabel={`Character ${character.stageName}`}>
      <View style={[styles.avatar, { width: dim.box, height: dim.box, borderRadius: dim.box / 2 }]}>
        <Text style={[styles.emoji, { fontSize: dim.emoji }]}>{character.emoji}</Text>
      </View>
      {showLabel ? (
        <>
          <Text style={styles.stageName}>{character.stageName}</Text>
          <Text style={styles.stageMeta}>
            Stage {character.stage}
            {character.nextStageName
              ? ` · ${character.progress}% to ${character.nextStageName}`
              : ' · Max evolution'}
          </Text>
        </>
      ) : null}
    </View>
  );
}
