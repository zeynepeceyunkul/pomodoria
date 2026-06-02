import type { CSSProperties } from 'react';
import type { CharacterState } from '../lib/characterEvolution';
import styles from './CharacterAvatar.module.css';

type CharacterAvatarProps = {
  character: CharacterState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
};

const sizeClass = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
} as const;

export function CharacterAvatar({
  character,
  size = 'md',
  showLabel = true,
  className = '',
}: CharacterAvatarProps) {
  return (
    <div className={`${styles.wrap} ${sizeClass[size]} ${className}`} aria-label={`Character: ${character.stageName}`}>
      <div
        className={styles.avatar}
        style={{ '--stage-progress': `${character.progress}%` } as CSSProperties}
      >
        <span className={styles.emoji} aria-hidden>
          {character.emoji}
        </span>
        <div className={styles.progressRing} aria-hidden />
      </div>
      {showLabel ? (
        <>
          <p className={styles.stageName}>{character.stageName}</p>
          <p className={styles.stageMeta}>
            Stage {character.stage}
            {character.nextStageName ? ` · ${character.progress}% to ${character.nextStageName}` : ' · Max evolution'}
          </p>
        </>
      ) : null}
    </div>
  );
}
