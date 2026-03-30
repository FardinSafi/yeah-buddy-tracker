import type { MuscleGroup, Workout, WorkoutSet, WeeklyStat } from "@/types/domain";
import { getRecentWeekKeys, getWeekKey, isDateInCurrentWeek } from "@/lib/utils/date";

export type WeeklySeriesPoint = {
  weekKey: string;
  tonnageKg: number;
};

export type MuscleGroupHistoryPoint = {
  weekKey: string;
  tonnageKg: number;
  targetKg: number;
};

export type ExerciseProgressionPoint = {
  workoutId?: number;
  dateIso: string;
  tonnageKg: number;
  totalReps: number;
  topSetWeightKg: number;
};

export function calculateSetTonnage(set: WorkoutSet): number {
  return set.reps * set.weightKg;
}

export function calculateWorkoutTonnage(sets: WorkoutSet[]): number {
  return sets.reduce((sum, set) => sum + calculateSetTonnage(set), 0);
}

export function buildWeeklyStats(workouts: Workout[], muscleGroups: MuscleGroup[]): WeeklyStat[] {
  const currentWeekWorkouts = workouts.filter((workout) => isDateInCurrentWeek(workout.dateIso));

  return muscleGroups.map((group) => {
    const tonnageKg = currentWeekWorkouts
      .filter((workout) => workout.muscleGroupId === group.id)
      .reduce((sum, workout) => sum + calculateWorkoutTonnage(workout.sets), 0);

    const percent = Math.min(100, Math.round((tonnageKg / group.weeklyTargetKg) * 100));

    return {
      muscleGroupId: group.id,
      name: group.name,
      tonnageKg,
      targetKg: group.weeklyTargetKg,
      percent,
      completed: tonnageKg >= group.weeklyTargetKg,
    };
  });
}

export function countWeeklyStreak(workouts: Workout[]): number {
  if (workouts.length === 0) {
    return 0;
  }

  const activeWeekKeys = new Set(
    workouts.map((workout) => {
      const date = new Date(workout.dateIso);
      const day = date.getDay();
      const mondayOffset = (day + 6) % 7;
      date.setDate(date.getDate() - mondayOffset);
      date.setHours(0, 0, 0, 0);
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
    }),
  );

  let streak = 0;
  const cursor = new Date();

  while (true) {
    const day = cursor.getDay();
    const mondayOffset = (day + 6) % 7;
    cursor.setDate(cursor.getDate() - mondayOffset);
    cursor.setHours(0, 0, 0, 0);
    const yearStart = new Date(cursor.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((cursor.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const key = `${cursor.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;

    if (!activeWeekKeys.has(key)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

export function buildWeeklySeries(
  workouts: Workout[],
  weekCount: number,
  fromDate = new Date(),
): WeeklySeriesPoint[] {
  const weekKeys = getRecentWeekKeys(weekCount, fromDate);
  const totals = workouts.reduce<Map<string, number>>((acc, workout) => {
    const weekKey = getWeekKey(new Date(workout.dateIso));
    const tonnage = calculateWorkoutTonnage(workout.sets);
    acc.set(weekKey, (acc.get(weekKey) ?? 0) + tonnage);
    return acc;
  }, new Map());

  return weekKeys.map((weekKey) => ({
    weekKey,
    tonnageKg: totals.get(weekKey) ?? 0,
  }));
}

export function buildMuscleGroupHistory(
  workouts: Workout[],
  muscleGroups: MuscleGroup[],
  weekCount: number,
  fromDate = new Date(),
): Record<MuscleGroup["id"], MuscleGroupHistoryPoint[]> {
  const weekKeys = getRecentWeekKeys(weekCount, fromDate);

  const grouped = workouts.reduce<Map<string, Map<MuscleGroup["id"], number>>>((acc, workout) => {
    const weekKey = getWeekKey(new Date(workout.dateIso));
    const byMuscle = acc.get(weekKey) ?? new Map<MuscleGroup["id"], number>();
    byMuscle.set(
      workout.muscleGroupId,
      (byMuscle.get(workout.muscleGroupId) ?? 0) + calculateWorkoutTonnage(workout.sets),
    );
    acc.set(weekKey, byMuscle);
    return acc;
  }, new Map());

  return muscleGroups.reduce<Record<MuscleGroup["id"], MuscleGroupHistoryPoint[]>>((acc, group) => {
    acc[group.id] = weekKeys.map((weekKey) => ({
      weekKey,
      tonnageKg: grouped.get(weekKey)?.get(group.id) ?? 0,
      targetKg: group.weeklyTargetKg,
    }));
    return acc;
  }, {} as Record<MuscleGroup["id"], MuscleGroupHistoryPoint[]>);
}

export function buildExerciseProgression(workouts: Workout[], exerciseId: string): ExerciseProgressionPoint[] {
  return workouts
    .filter((workout) => workout.exerciseId === exerciseId)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
    .map((workout) => ({
      workoutId: workout.id,
      dateIso: workout.dateIso,
      tonnageKg: calculateWorkoutTonnage(workout.sets),
      totalReps: workout.sets.reduce((sum, set) => sum + set.reps, 0),
      topSetWeightKg: workout.sets.reduce((max, set) => Math.max(max, set.weightKg), 0),
    }));
}
