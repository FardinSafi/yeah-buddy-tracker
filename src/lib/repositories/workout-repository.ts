import { db } from "@/lib/db/database";
import { getRangeIsoForRecentWeeks, getWeekKey } from "@/lib/utils/date";
import type { Exercise, MilestoneEvent, MuscleGroup, Workout } from "@/types/domain";

export const workoutRepository = {
  async getBootstrapData(): Promise<{
    workouts: Workout[];
    muscleGroups: MuscleGroup[];
    exercises: Exercise[];
    isMuted: boolean;
  }> {
    const [workouts, muscleGroups, exercises, settings] = await Promise.all([
      db.workouts.toArray(),
      db.muscleGroups.toArray(),
      db.exercises.toArray(),
      db.appSettings.get("settings"),
    ]);

    return {
      workouts,
      muscleGroups,
      exercises,
      isMuted: settings?.isMuted ?? false,
    };
  },

  async saveWorkout(workout: Workout): Promise<number> {
    return db.workouts.add(workout);
  },

  async getWorkoutsByDateRange(startIso: string, endIso: string): Promise<Workout[]> {
    return db.workouts.where("dateIso").between(startIso, endIso, true, true).toArray();
  },

  async getRecentWeeksGrouped(
    limitWeeks = 6,
  ): Promise<Array<{ weekKey: string; workouts: Workout[] }>> {
    const { startIso, endIso } = getRangeIsoForRecentWeeks(limitWeeks);
    const workouts = await this.getWorkoutsByDateRange(startIso, endIso);

    const groupedByWeek = workouts.reduce<Map<string, Workout[]>>((acc, workout) => {
      const weekKey = getWeekKey(new Date(workout.dateIso));
      const existing = acc.get(weekKey) ?? [];
      existing.push(workout);
      acc.set(weekKey, existing);
      return acc;
    }, new Map());

    return [...groupedByWeek.entries()]
      .sort(([weekA], [weekB]) => weekA.localeCompare(weekB))
      .map(([weekKey, items]) => ({
        weekKey,
        workouts: items.sort((a, b) => a.dateIso.localeCompare(b.dateIso)),
      }));
  },

  async getExerciseWorkouts(
    exerciseId: string,
    startIso: string,
    endIso: string,
  ): Promise<Workout[]> {
    const workouts = await this.getWorkoutsByDateRange(startIso, endIso);
    return workouts
      .filter((workout) => workout.exerciseId === exerciseId)
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  },

  async setMuted(isMuted: boolean): Promise<void> {
    await db.appSettings.put({ id: "settings", isMuted, unit: "kg" });
  },

  async createMilestoneEvent(muscleGroupId: MuscleGroup["id"]): Promise<void> {
    const milestone: MilestoneEvent = {
      weekKey: getWeekKey(new Date()),
      muscleGroupId,
      achievedAtIso: new Date().toISOString(),
    };

    await db.milestoneEvents.add(milestone);
  },

  async milestoneExistsForCurrentWeek(muscleGroupId: MuscleGroup["id"]): Promise<boolean> {
    const weekKey = getWeekKey(new Date());
    const match = await db.milestoneEvents
      .where("[weekKey+muscleGroupId]")
      .equals([weekKey, muscleGroupId])
      .first();
    return Boolean(match);
  },
};
