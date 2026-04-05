"use client";

import { create } from "zustand";
import { randomQuote } from "@/data/quotes";
import { ensureSeedData } from "@/lib/db/seed";
import { workoutRepository } from "../lib/repositories/workout-repository";
import { playYeahBuddySound } from "@/lib/utils/audio";
import { getRangeIsoForRecentWeeks, getRecentWeekKeys, getWeekKey, toIsoDayKey } from "@/lib/utils/date";
import { downloadJsonFile, parseImportPayload } from "@/lib/utils/export-import";
import {
  buildExerciseProgression,
  buildMuscleGroupHistory,
  buildWeeklySeries,
  buildWeeklyStats,
  calculateWorkoutTonnage,
  countWeeklyStreak,
  getHistoricalTopSetWeightKg,
  getTopSetWeightKg,
  type ExerciseProgressionPoint,
  type MuscleGroupHistoryPoint,
  type WeeklySeriesPoint,
} from "@/lib/utils/tonnage";
import type { Exercise, MuscleGroup, WeeklyStat, Workout, WorkoutSet } from "@/types/domain";

const DEFAULT_HISTORY_WEEKS = 6;
const DEFAULT_ANALYTICS_WEEKS = 6;

export type HistoryWorkoutSummary = {
  id?: number;
  dateIso: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroupId: MuscleGroup["id"];
  muscleGroupName: string;
  setCount: number;
  tonnageKg: number;
  notes?: string;
};

export type HistoryDaySummary = {
  dayKey: string;
  totalTonnageKg: number;
  workouts: HistoryWorkoutSummary[];
};

export type HistoryWeekSummary = {
  weekKey: string;
  totalTonnageKg: number;
  workoutCount: number;
  days: HistoryDaySummary[];
};

type WorkoutInput = {
  muscleGroupId: MuscleGroup["id"];
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
};

type MilestoneCelebration = {
  kind: "milestone";
  muscleGroupName: string;
  quote: string;
};

type PrCelebration = {
  kind: "exercise-pr";
  exerciseName: string;
  previousTopSetKg: number;
  newTopSetKg: number;
};

export type CelebrationState = MilestoneCelebration | PrCelebration | null;

type WorkoutStore = {
  initialized: boolean;
  isSaving: boolean;
  isHistoryLoading: boolean;
  isAnalyticsLoading: boolean;
  isMuted: boolean;
  syncQueuedCount: number;
  syncFailedCount: number;
  syncSyncingCount: number;
  workouts: Workout[];
  muscleGroups: MuscleGroup[];
  exercises: Exercise[];
  weeklyStats: WeeklyStat[];
  weeklyStreak: number;
  historyWeeks: HistoryWeekSummary[];
  selectedHistoryWeekKey: string | null;
  weeklySeries: WeeklySeriesPoint[];
  muscleGroupHistory: Record<MuscleGroup["id"], MuscleGroupHistoryPoint[]>;
  selectedExerciseId: string | null;
  exerciseProgression: ExerciseProgressionPoint[];
  quoteOfTheRefresh: string;
  celebration: CelebrationState;
  celebrationQueue: Exclude<CelebrationState, null>[];
  bootstrap: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshHistory: (weekCount?: number) => Promise<void>;
  selectHistoryWeek: (weekKey: string) => void;
  refreshAnalytics: (weekCount?: number) => Promise<void>;
  refreshExerciseProgression: (exerciseId: string, weekCount?: number) => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  syncPendingChanges: () => Promise<void>;
  findSimilarExercises: (
    muscleGroupId: MuscleGroup["id"],
    name: string,
    excludeExerciseId?: string,
  ) => Promise<Exercise[]>;
  createExercise: (muscleGroupId: MuscleGroup["id"], name: string) => Promise<Exercise>;
  updateExerciseName: (exerciseId: string, name: string) => Promise<Exercise>;
  deleteExercise: (exerciseId: string) => Promise<void>;
  saveWorkout: (input: WorkoutInput) => Promise<void>;
  updateMuscleGroupTarget: (muscleGroupId: MuscleGroup["id"], weeklyTargetKg: number) => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  closeCelebration: () => void;
  exportJson: () => Promise<void>;
  importJsonFile: (file: File) => Promise<void>;
};

function toWeeklyState(workouts: Workout[], muscleGroups: MuscleGroup[]) {
  const weeklyStats = buildWeeklyStats(workouts, muscleGroups);
  const weeklyStreak = countWeeklyStreak(workouts);
  return { weeklyStats, weeklyStreak };
}

function buildHistoryWeeks(
  workouts: Workout[],
  exercises: Exercise[],
  muscleGroups: MuscleGroup[],
  weekCount: number,
): HistoryWeekSummary[] {
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const muscleGroupMap = new Map(muscleGroups.map((group) => [group.id, group.name]));
  const groupedByWeek = workouts.reduce<Map<string, Workout[]>>((acc, workout) => {
    const weekKey = getWeekKey(new Date(workout.dateIso));

    const existing = acc.get(weekKey) ?? [];
    existing.push(workout);
    acc.set(weekKey, existing);
    return acc;
  }, new Map());

  const weekKeys = getRecentWeekKeys(weekCount);

  return weekKeys
    .map((weekKey) => {
      const weekWorkouts = (groupedByWeek.get(weekKey) ?? []).sort((a, b) => b.dateIso.localeCompare(a.dateIso));

      const summaries = weekWorkouts.map<HistoryWorkoutSummary>((workout) => ({
        id: workout.id,
        dateIso: workout.dateIso,
        exerciseId: workout.exerciseId,
        exerciseName: exerciseMap.get(workout.exerciseId) ?? "Unknown exercise",
        muscleGroupId: workout.muscleGroupId,
        muscleGroupName: muscleGroupMap.get(workout.muscleGroupId) ?? "Unknown group",
        setCount: workout.sets.length,
        tonnageKg: calculateWorkoutTonnage(workout.sets),
        notes: workout.notes,
      }));

      const daysMap = summaries.reduce<Map<string, HistoryWorkoutSummary[]>>((acc, workout) => {
        const dayKey = toIsoDayKey(workout.dateIso);
        const existing = acc.get(dayKey) ?? [];
        existing.push(workout);
        acc.set(dayKey, existing);
        return acc;
      }, new Map());

      const days = [...daysMap.entries()]
        .sort(([dayA], [dayB]) => dayB.localeCompare(dayA))
        .map(([dayKey, dayWorkouts]) => ({
          dayKey,
          workouts: dayWorkouts.sort((a, b) => b.dateIso.localeCompare(a.dateIso)),
          totalTonnageKg: dayWorkouts.reduce((sum, workout) => sum + workout.tonnageKg, 0),
        }));

      return {
        weekKey,
        workoutCount: summaries.length,
        totalTonnageKg: summaries.reduce((sum, workout) => sum + workout.tonnageKg, 0),
        days,
      };
    })
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  initialized: false,
  isSaving: false,
  isHistoryLoading: false,
  isAnalyticsLoading: false,
  isMuted: false,
  syncQueuedCount: 0,
  syncFailedCount: 0,
  syncSyncingCount: 0,
  workouts: [],
  muscleGroups: [],
  exercises: [],
  weeklyStats: [],
  weeklyStreak: 0,
  historyWeeks: [],
  selectedHistoryWeekKey: null,
  weeklySeries: [],
  muscleGroupHistory: {} as Record<MuscleGroup["id"], MuscleGroupHistoryPoint[]>,
  selectedExerciseId: null,
  exerciseProgression: [],
  quoteOfTheRefresh: randomQuote(),
  celebration: null,
  celebrationQueue: [],

  bootstrap: async () => {
    try {
      await ensureSeedData();
      await workoutRepository.syncPendingChanges();
    } catch (error) {
      const message = workoutRepository.asErrorMessage(error, "");
      if (message.toLowerCase().includes("signed in")) {
        return;
      }
      throw error;
    }

    const data = await workoutRepository.getBootstrapData();
    const { weeklyStats, weeklyStreak } = toWeeklyState(data.workouts, data.muscleGroups);

    set({
      initialized: true,
      workouts: data.workouts,
      muscleGroups: data.muscleGroups,
      exercises: data.exercises,
      isMuted: data.isMuted,
      weeklyStats,
      weeklyStreak,
      quoteOfTheRefresh: randomQuote(),
    });

    await Promise.all([
      get().refreshHistory(DEFAULT_HISTORY_WEEKS),
      get().refreshAnalytics(DEFAULT_ANALYTICS_WEEKS),
      get().refreshSyncStatus(),
    ]);
  },

  refreshStats: async () => {
    const { workouts, muscleGroups } = get();
    const { weeklyStats, weeklyStreak } = toWeeklyState(workouts, muscleGroups);
    set({ weeklyStats, weeklyStreak });
  },

  refreshHistory: async (weekCount = DEFAULT_HISTORY_WEEKS) => {
    set({ isHistoryLoading: true });

    const [groupedWeeks, exercises, muscleGroups] = await Promise.all([
      workoutRepository.getRecentWeeksGrouped(weekCount),
      Promise.resolve(get().exercises),
      Promise.resolve(get().muscleGroups),
    ]);

    const workouts = groupedWeeks.flatMap((group) => group.workouts);
    const historyWeeks = buildHistoryWeeks(workouts, exercises, muscleGroups, weekCount);
    const selectedHistoryWeekKey =
      get().selectedHistoryWeekKey && historyWeeks.some((week) => week.weekKey === get().selectedHistoryWeekKey)
        ? get().selectedHistoryWeekKey
        : (historyWeeks[0]?.weekKey ?? null);

    set({
      historyWeeks,
      selectedHistoryWeekKey,
      isHistoryLoading: false,
    });
  },

  selectHistoryWeek: (weekKey) => {
    set({ selectedHistoryWeekKey: weekKey });
  },

  refreshAnalytics: async (weekCount = DEFAULT_ANALYTICS_WEEKS) => {
    set({ isAnalyticsLoading: true });

    const { workouts, muscleGroups } = get();
    const weeklySeries = buildWeeklySeries(workouts, weekCount);
    const muscleGroupHistory = buildMuscleGroupHistory(workouts, muscleGroups, weekCount);

    set({
      weeklySeries,
      muscleGroupHistory,
      isAnalyticsLoading: false,
    });
  },

  refreshExerciseProgression: async (exerciseId, weekCount = DEFAULT_ANALYTICS_WEEKS) => {
    const { startIso, endIso } = getRangeIsoForRecentWeeks(weekCount);
    const workouts = await workoutRepository.getExerciseWorkouts(exerciseId, startIso, endIso);

    set({
      selectedExerciseId: exerciseId,
      exerciseProgression: buildExerciseProgression(workouts, exerciseId),
    });
  },

  refreshSyncStatus: async () => {
    try {
      const status = await workoutRepository.getSyncQueueStatus();
      set({
        syncQueuedCount: status.queuedCount,
        syncFailedCount: status.failedCount,
        syncSyncingCount: status.syncingCount,
      });
    } catch {
      set({
        syncQueuedCount: 0,
        syncFailedCount: 0,
        syncSyncingCount: 0,
      });
    }
  },

  syncPendingChanges: async () => {
    await workoutRepository.syncPendingChanges();

    const data = await workoutRepository.getBootstrapData();
    const { weeklyStats, weeklyStreak } = toWeeklyState(data.workouts, data.muscleGroups);

    set({
      workouts: data.workouts,
      muscleGroups: data.muscleGroups,
      exercises: data.exercises,
      isMuted: data.isMuted,
      weeklyStats,
      weeklyStreak,
    });

    await Promise.all([
      get().refreshHistory(DEFAULT_HISTORY_WEEKS),
      get().refreshAnalytics(DEFAULT_ANALYTICS_WEEKS),
      get().refreshSyncStatus(),
    ]);
  },

  findSimilarExercises: async (muscleGroupId, name, excludeExerciseId) => {
    return workoutRepository.findSimilarExercisesForMuscleGroup(muscleGroupId, name, excludeExerciseId);
  },

  createExercise: async (muscleGroupId, name) => {
    const created = await workoutRepository.createExercise({ muscleGroupId, name });

    set((state) => ({
      exercises: [...state.exercises, created].sort((a, b) => a.name.localeCompare(b.name)),
    }));

    await get().refreshSyncStatus();
    return created;
  },

  updateExerciseName: async (exerciseId, name) => {
    const updated = await workoutRepository.updateExerciseName(exerciseId, name);

    set((state) => ({
      exercises: state.exercises
        .map((exercise) => (exercise.id === exerciseId ? updated : exercise))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));

    await get().refreshSyncStatus();
    return updated;
  },

  deleteExercise: async (exerciseId) => {
    await workoutRepository.deleteExercise(exerciseId);

    set((state) => ({
      exercises: state.exercises.filter((exercise) => exercise.id !== exerciseId),
    }));

    await get().refreshSyncStatus();
  },

  saveWorkout: async (input) => {
    set({ isSaving: true });
    try {
      const createdAtIso = new Date().toISOString();
      const workout: Workout = {
        dateIso: createdAtIso,
        createdAtIso,
        exerciseId: input.exerciseId,
        muscleGroupId: input.muscleGroupId,
        sets: input.sets,
        notes: input.notes?.trim() || undefined,
      };

      await workoutRepository.saveWorkout(workout);

      const previousExerciseWorkouts = get().workouts.filter((entry) => entry.exerciseId === input.exerciseId);
      const previousExerciseTopSetKg = getHistoricalTopSetWeightKg(previousExerciseWorkouts);
      const currentExerciseTopSetKg = getTopSetWeightKg(workout.sets);

      const data = await workoutRepository.getBootstrapData();
      const previousStats = get().weeklyStats;
      const { weeklyStats, weeklyStreak } = toWeeklyState(data.workouts, data.muscleGroups);
      const nextCelebrations: Exclude<CelebrationState, null>[] = [];

      set({
        workouts: data.workouts,
        muscleGroups: data.muscleGroups,
        exercises: data.exercises,
        weeklyStats,
        weeklyStreak,
      });

      await Promise.all([
        get().refreshHistory(DEFAULT_HISTORY_WEEKS),
        get().refreshAnalytics(DEFAULT_ANALYTICS_WEEKS),
        get().refreshSyncStatus(),
      ]);

      if (get().selectedExerciseId === input.exerciseId) {
        await get().refreshExerciseProgression(input.exerciseId, DEFAULT_ANALYTICS_WEEKS);
      }

      if (currentExerciseTopSetKg > previousExerciseTopSetKg) {
        const exerciseName = data.exercises.find((exercise) => exercise.id === input.exerciseId)?.name ?? "This exercise";
        nextCelebrations.push({
          kind: "exercise-pr",
          exerciseName,
          previousTopSetKg: previousExerciseTopSetKg,
          newTopSetKg: currentExerciseTopSetKg,
        });
      }

      const currentMuscle = weeklyStats.find((stat) => stat.muscleGroupId === input.muscleGroupId);
      const previousMuscle = previousStats.find((stat) => stat.muscleGroupId === input.muscleGroupId);

      if (currentMuscle?.completed && !previousMuscle?.completed) {
        const exists = await workoutRepository.milestoneExistsForCurrentWeek(input.muscleGroupId);

        if (!exists) {
          await workoutRepository.createMilestoneEvent(input.muscleGroupId);
          nextCelebrations.push({
            kind: "milestone",
            muscleGroupName: currentMuscle.name,
            quote: randomQuote(),
          });
        }
      }

      if (nextCelebrations.length > 0) {
        const isMuted = get().isMuted;
        playYeahBuddySound(isMuted);

        set((state) => {
          const queue = [...state.celebrationQueue, ...nextCelebrations];
          const celebration = state.celebration ?? queue.shift() ?? null;
          return {
            celebration,
            celebrationQueue: queue,
          };
        });
      }
    } finally {
      set({ isSaving: false });
    }
  },

  updateMuscleGroupTarget: async (muscleGroupId, weeklyTargetKg) => {
    const updatedGroup = await workoutRepository.updateMuscleGroupTarget(muscleGroupId, weeklyTargetKg);
    const muscleGroups = get().muscleGroups.map((group) => (group.id === muscleGroupId ? updatedGroup : group));
    const { weeklyStats, weeklyStreak } = toWeeklyState(get().workouts, muscleGroups);
    const muscleGroupHistory = buildMuscleGroupHistory(get().workouts, muscleGroups, DEFAULT_ANALYTICS_WEEKS);

    set({ muscleGroups, weeklyStats, weeklyStreak, muscleGroupHistory });
    await get().refreshSyncStatus();
  },

  setMuted: async (muted) => {
    await workoutRepository.setMuted(muted);
    set({ isMuted: muted });
    await get().refreshSyncStatus();
  },

  closeCelebration: () => {
    set((state) => {
      const queue = [...state.celebrationQueue];
      return {
        celebration: queue.shift() ?? null,
        celebrationQueue: queue,
      };
    });
  },

  exportJson: async () => {
    const payload = await workoutRepository.buildUserExportPayload();
    downloadJsonFile(payload);
  },

  importJsonFile: async (file) => {
    const text = await file.text();
    const payload = parseImportPayload(text);
    await workoutRepository.replaceAllUserData(payload.data);
    await get().bootstrap();
  },
}));
