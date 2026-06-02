export type CharacterState = {
  stage: number;
  stageName: string;
  emoji: string;
  progress: number;
  nextStageName: string | null;
  levelsToNextStage: number;
};

export const CHARACTER_STAGES = [
  { stage: 1, name: 'Seed', emoji: '🌰', minLevel: 1 },
  { stage: 2, name: 'Sprout', emoji: '🌱', minLevel: 3 },
  { stage: 3, name: 'Small Plant', emoji: '🪴', minLevel: 6 },
  { stage: 4, name: 'Young Tree', emoji: '🌳', minLevel: 10 },
  { stage: 5, name: 'Mature Tree', emoji: '🌲', minLevel: 15 },
] as const;

export function buildCharacterState(level: number): CharacterState {
  const lv = Math.max(1, level || 1);
  type Stage = (typeof CHARACTER_STAGES)[number];
  let current: Stage = CHARACTER_STAGES[0];
  for (const s of CHARACTER_STAGES) {
    if (lv >= s.minLevel) current = s;
  }
  const idx = CHARACTER_STAGES.findIndex((s) => s.stage === current.stage);
  const next = idx >= 0 && idx < CHARACTER_STAGES.length - 1 ? CHARACTER_STAGES[idx + 1] : null;
  if (!next) {
    return {
      stage: current.stage,
      stageName: current.name,
      emoji: current.emoji,
      progress: 100,
      nextStageName: null,
      levelsToNextStage: 0,
    };
  }
  const span = next.minLevel - current.minLevel;
  const into = lv - current.minLevel;
  return {
    stage: current.stage,
    stageName: current.name,
    emoji: current.emoji,
    progress: Math.min(100, Math.round((into / span) * 100)),
    nextStageName: next.name,
    levelsToNextStage: Math.max(0, next.minLevel - lv),
  };
}
