import type { Exercise, MuscleGroupId } from "@/types/domain";

const NON_ALPHANUMERIC_REGEX = /[^a-z0-9\s]/g;
const MULTI_SPACE_REGEX = /\s+/g;

export function normalizeExerciseName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_REGEX, " ")
    .replace(MULTI_SPACE_REGEX, " ")
    .trim();
}

function splitTokens(value: string): string[] {
  return normalizeExerciseName(value)
    .split(" ")
    .filter(Boolean);
}

function getTokenOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const aSet = new Set(a);
  const bSet = new Set(b);
  const overlap = [...aSet].filter((token) => bSet.has(token)).length;
  return overlap / Math.max(aSet.size, bSet.size);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function isConservativeMatch(targetName: string, candidateName: string): boolean {
  const normalizedTarget = normalizeExerciseName(targetName);
  const normalizedCandidate = normalizeExerciseName(candidateName);

  if (!normalizedTarget || !normalizedCandidate) {
    return false;
  }

  if (normalizedTarget === normalizedCandidate) {
    return true;
  }

  if (normalizedTarget.startsWith(normalizedCandidate) || normalizedCandidate.startsWith(normalizedTarget)) {
    return true;
  }

  const targetTokens = splitTokens(normalizedTarget);
  const candidateTokens = splitTokens(normalizedCandidate);
  const overlapScore = getTokenOverlapScore(targetTokens, candidateTokens);

  if (overlapScore >= 0.8) {
    return true;
  }

  if (Math.abs(normalizedTarget.length - normalizedCandidate.length) > 2) {
    return false;
  }

  return levenshteinDistance(normalizedTarget, normalizedCandidate) <= 2;
}

export function findConservativeExerciseMatches(params: {
  name: string;
  exercises: Exercise[];
  muscleGroupId: MuscleGroupId;
  excludeExerciseId?: string;
}): Exercise[] {
  const filtered = params.exercises
    .filter((exercise) => exercise.muscleGroupId === params.muscleGroupId)
    .filter((exercise) => exercise.id !== params.excludeExerciseId)
    .filter((exercise) => isConservativeMatch(params.name, exercise.name));

  return filtered.sort((a, b) => {
    const aNormalized = normalizeExerciseName(a.name);
    const bNormalized = normalizeExerciseName(b.name);
    const target = normalizeExerciseName(params.name);
    const aDistance = levenshteinDistance(target, aNormalized);
    const bDistance = levenshteinDistance(target, bNormalized);
    return aDistance - bDistance || a.name.localeCompare(b.name);
  });
}
