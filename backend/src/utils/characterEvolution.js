const STAGES = [
  { stage: 1, name: 'Seed', emoji: '🌰', minLevel: 1 },
  { stage: 2, name: 'Sprout', emoji: '🌱', minLevel: 3 },
  { stage: 3, name: 'Small Plant', emoji: '🪴', minLevel: 6 },
  { stage: 4, name: 'Young Tree', emoji: '🌳', minLevel: 10 },
  { stage: 5, name: 'Mature Tree', emoji: '🌲', minLevel: 15 },
];

function getStageForLevel(level) {
  const lv = Math.max(1, level || 1);
  let current = STAGES[0];
  for (const s of STAGES) {
    if (lv >= s.minLevel) current = s;
  }
  return current;
}

function getNextStage(currentStage) {
  const idx = STAGES.findIndex((s) => s.stage === currentStage.stage);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

/**
 * Progress 0–100 within the current evolution stage (based on level bands).
 */
function characterProgressForLevel(level) {
  const lv = Math.max(1, level || 1);
  const current = getStageForLevel(lv);
  const next = getNextStage(current);
  if (!next) return 100;

  const span = next.minLevel - current.minLevel;
  const into = lv - current.minLevel;
  return Math.min(100, Math.round((into / span) * 100));
}

function buildCharacterState(level) {
  const current = getStageForLevel(level);
  const next = getNextStage(current);
  return {
    stage: current.stage,
    stageName: current.name,
    emoji: current.emoji,
    progress: characterProgressForLevel(level),
    nextStageName: next ? next.name : null,
    levelsToNextStage: next ? Math.max(0, next.minLevel - Math.max(1, level || 1)) : 0,
  };
}

module.exports = {
  STAGES,
  getStageForLevel,
  getNextStage,
  characterProgressForLevel,
  buildCharacterState,
};
