import {
  db,
  type SyncQueueExercisePayload,
  type SyncQueueItem,
  type SyncQueueMilestonePayload,
  type SyncQueueMuscleGroupPayload,
  type SyncQueueSettingPayload,
  type SyncQueueWorkoutPayload,
} from "../db/database";
import { createClient } from "@/lib/supabase/client";
import { findConservativeExerciseMatches, normalizeExerciseName } from "@/lib/utils/exercise-name";
import { getRangeIsoForRecentWeeks, getWeekKey } from "@/lib/utils/date";
import type { AppSettings, Exercise, ExportPayload, MilestoneEvent, MuscleGroup, Workout } from "@/types/domain";

type MuscleGroupRow = {
  id: MuscleGroup["id"];
  user_id: string;
  name: string;
  weekly_target_kg: number;
  accent_color: string;
};

type ExerciseRow = {
  id: string;
  user_id: string;
  name: string;
  muscle_group_id: MuscleGroup["id"];
  is_custom?: boolean;
};

type WorkoutRow = {
  id: number;
  user_id: string;
  date_iso: string;
  muscle_group_id: MuscleGroup["id"];
  exercise_id: string;
  sets: Workout["sets"];
  notes: string | null;
  created_at_iso: string;
};

type AppSettingsRow = {
  id?: "settings";
  user_id: string;
  is_muted: boolean;
  unit: "kg";
};

type MilestoneEventRow = {
  id: number;
  user_id: string;
  week_key: string;
  muscle_group_id: MuscleGroup["id"];
  achieved_at_iso: string;
};

const SYNC_BACKOFF_BASE_MS = 2000;
const SYNC_BACKOFF_MAX_MS = 5 * 60 * 1000;

function toMuscleGroup(row: MuscleGroupRow): MuscleGroup {
  return {
    id: row.id,
    name: row.name,
    weeklyTargetKg: Number(row.weekly_target_kg),
    accentColor: row.accent_color,
  };
}

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroupId: row.muscle_group_id,
    isCustom: Boolean(row.is_custom),
  };
}

function toExerciseRow(userId: string, exercise: Exercise) {
  return {
    user_id: userId,
    id: exercise.id,
    name: exercise.name,
    muscle_group_id: exercise.muscleGroupId,
    is_custom: exercise.isCustom ?? false,
  };
}

function toWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    dateIso: row.date_iso,
    muscleGroupId: row.muscle_group_id,
    exerciseId: row.exercise_id,
    sets: row.sets,
    notes: row.notes ?? undefined,
    createdAtIso: row.created_at_iso,
  };
}

function toAppSettings(row: AppSettingsRow): AppSettings {
  return {
    id: row.id ?? "settings",
    isMuted: row.is_muted,
    unit: row.unit,
  };
}

function toMilestoneEvent(row: MilestoneEventRow): MilestoneEvent {
  return {
    id: row.id,
    weekKey: row.week_key,
    muscleGroupId: row.muscle_group_id,
    achievedAtIso: row.achieved_at_iso,
  };
}

function toWorkoutRow(userId: string, workout: Workout) {
  return {
    user_id: userId,
    date_iso: workout.dateIso,
    muscle_group_id: workout.muscleGroupId,
    exercise_id: workout.exerciseId,
    sets: workout.sets,
    notes: workout.notes ?? null,
    created_at_iso: workout.createdAtIso,
  };
}

async function persistMuscleGroupTarget(userId: string, muscleGroupId: MuscleGroup["id"], weeklyTargetKg: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("muscle_groups")
    .update({ weekly_target_kg: weeklyTargetKg })
    .eq("user_id", userId)
    .eq("id", muscleGroupId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toMuscleGroup(data as MuscleGroupRow);
}

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function createLocalTempId(): number {
  return -Math.floor(Date.now() * 1000 + Math.random() * 1000);
}

function createCustomExerciseId(muscleGroupId: MuscleGroup["id"], name: string): string {
  const slug = normalizeExerciseName(name).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 36);
  const safeSlug = slug || "custom";
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${muscleGroupId}-${safeSlug}-${suffix}`;
}

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.id) {
    return session.user.id;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to access workout data.");
  }

  return user.id;
}

function asErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  return fallback;
}

function computeBackoffMs(retries: number): number {
  const exponent = Math.max(0, retries);
  return Math.min(SYNC_BACKOFF_MAX_MS, SYNC_BACKOFF_BASE_MS * 2 ** exponent);
}

function nowIso(): string {
  return new Date().toISOString();
}

function isMissingAppSettingsIdColumn(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("app_settings.id") ||
    normalized.includes("could not find the 'id' column") ||
    normalized.includes("column id does not exist")
  );
}

async function upsertAppSettings(params: {
  userId: string;
  isMuted: boolean;
  unit?: "kg";
  id?: "settings";
}): Promise<void> {
  const supabase = createClient();
  const unit = params.unit ?? "kg";
  const id = params.id ?? "settings";

  const { error } = await supabase.from("app_settings").upsert(
    {
      id,
      user_id: params.userId,
      is_muted: params.isMuted,
      unit,
    },
    { onConflict: "user_id,id" },
  );

  if (error) {
    if (!isMissingAppSettingsIdColumn(error.message)) {
      throw new Error(error.message);
    }

    const { error: legacyError } = await supabase.from("app_settings").upsert(
      {
        user_id: params.userId,
        is_muted: params.isMuted,
        unit,
      },
      { onConflict: "user_id" },
    );

    if (legacyError) {
      throw new Error(
        `Supabase schema is out of date for app_settings.id. Apply migration 202603310001_enforce_settings_id_and_initialize_users.sql. Details: ${legacyError.message}`,
      );
    }
  }
}

async function getCurrentUserSettingsRow(userId: string): Promise<AppSettingsRow | null> {
  const supabase = createClient();

  const canonicalResult = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("id", "settings")
    .maybeSingle();

  if (!canonicalResult.error) {
    return (canonicalResult.data as AppSettingsRow | null) ?? null;
  }

  if (!isMissingAppSettingsIdColumn(canonicalResult.error.message)) {
    throw new Error(canonicalResult.error.message);
  }

  const legacyResult = await supabase.from("app_settings").select("*").eq("user_id", userId).maybeSingle();

  if (legacyResult.error) {
    throw new Error(legacyResult.error.message);
  }

  return (legacyResult.data as AppSettingsRow | null) ?? null;
}

async function getCurrentUserSettingsRows(userId: string): Promise<AppSettingsRow[]> {
  const supabase = createClient();

  const canonicalResult = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("id", "settings");

  if (!canonicalResult.error) {
    return (canonicalResult.data as AppSettingsRow[]) ?? [];
  }

  if (!isMissingAppSettingsIdColumn(canonicalResult.error.message)) {
    throw new Error(canonicalResult.error.message);
  }

  const legacyResult = await supabase.from("app_settings").select("*").eq("user_id", userId);

  if (legacyResult.error) {
    throw new Error(legacyResult.error.message);
  }

  return (legacyResult.data as AppSettingsRow[]) ?? [];
}

async function putCacheFromRemote(args: {
  workouts: Workout[];
  muscleGroups: MuscleGroup[];
  exercises: Exercise[];
  settings: AppSettings;
}): Promise<void> {
  await db.transaction("rw", [db.workouts, db.muscleGroups, db.exercises, db.appSettings], async () => {
    await Promise.all([db.workouts.clear(), db.muscleGroups.clear(), db.exercises.clear(), db.appSettings.clear()]);
    await Promise.all([
      db.workouts.bulkPut(args.workouts),
      db.muscleGroups.bulkPut(args.muscleGroups),
      db.exercises.bulkPut(args.exercises),
      db.appSettings.put(args.settings),
    ]);
  });
}

async function getCachedBootstrapData() {
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
}

async function queueItem(item: Omit<SyncQueueItem, "id">): Promise<number> {
  return db.syncQueue.add({
    ...item,
    nextAttemptAtIso: item.nextAttemptAtIso ?? nowIso(),
  });
}

async function getPendingQueueForUser(userId: string): Promise<SyncQueueItem[]> {
  const now = Date.now();
  const records = await db.syncQueue.where("userId").equals(userId).sortBy("createdAtIso");
  return records.filter((record) => {
    if (!(record.status === "pending" || record.status === "failed")) {
      return false;
    }

    if (!record.nextAttemptAtIso) {
      return true;
    }

    const dueAt = Date.parse(record.nextAttemptAtIso);
    return Number.isNaN(dueAt) || dueAt <= now;
  });
}

async function getPendingWorkoutEntries(userId: string): Promise<Workout[]> {
  const records = await db.syncQueue.where("userId").equals(userId).sortBy("createdAtIso");
  return records
    .filter(
      (record) =>
        (record.status === "pending" || record.status === "failed" || record.status === "syncing") &&
        record.entityType === "workout",
    )
    .map((record) => {
      const payload = record.payload as SyncQueueWorkoutPayload;
      return {
        ...payload.workout,
        id: payload.localId,
      };
    });
}

async function getPendingExerciseMutations(userId: string): Promise<SyncQueueItem[]> {
  const records = await db.syncQueue.where("userId").equals(userId).sortBy("createdAtIso");
  return records.filter(
    (record) =>
      (record.status === "pending" || record.status === "failed" || record.status === "syncing") &&
      record.entityType === "exercise",
  );
}

function applyPendingExerciseMutations(exercises: Exercise[], queueItems: SyncQueueItem[]): Exercise[] {
  const map = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  for (const item of queueItems) {
    const payload = item.payload as SyncQueueExercisePayload;

    if (payload.action === "create") {
      map.set(payload.exercise.id, payload.exercise);
      continue;
    }

    if (payload.action === "update") {
      const existing = map.get(payload.exerciseId);
      if (!existing) {
        continue;
      }

      map.set(payload.exerciseId, {
        ...existing,
        name: payload.name,
      });
      continue;
    }

    map.delete(payload.exerciseId);
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function setQueueStatus(id: number, status: SyncQueueItem["status"], lastError?: string) {
  const existing = await db.syncQueue.get(id);
  if (!existing) {
    return;
  }

  const nextRetries = status === "failed" ? existing.retries + 1 : existing.retries;
  const nextAttemptAtIso =
    status === "failed" ? new Date(Date.now() + computeBackoffMs(nextRetries)).toISOString() : nowIso();

  await db.syncQueue.update(id, {
    status,
    lastError,
    retries: nextRetries,
    nextAttemptAtIso,
  });
}

async function syncQueueItem(userId: string, item: SyncQueueItem): Promise<void> {
  const supabase = createClient();

  if (item.entityType === "workout") {
    const payload = item.payload as SyncQueueWorkoutPayload;
    const { data, error } = await supabase
      .from("workouts")
      .insert(toWorkoutRow(userId, payload.workout))
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (payload.localId) {
      await db.workouts.delete(payload.localId);
    }
    await db.workouts.put(toWorkout(data as WorkoutRow));
    return;
  }

  if (item.entityType === "setting") {
    const payload = item.payload as SyncQueueSettingPayload;
    await upsertAppSettings({ userId, isMuted: payload.isMuted, unit: "kg", id: "settings" });

    return;
  }

  if (item.entityType === "muscleGroup") {
    const payload = item.payload as SyncQueueMuscleGroupPayload;
    await persistMuscleGroupTarget(userId, payload.muscleGroupId, payload.weeklyTargetKg);
    return;
  }

  if (item.entityType === "exercise") {
    const payload = item.payload as SyncQueueExercisePayload;

    if (payload.action === "create") {
      const { error } = await supabase.from("exercises").insert(toExerciseRow(userId, payload.exercise));

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    if (payload.action === "update") {
      const { error } = await supabase
        .from("exercises")
        .update({ name: payload.name })
        .eq("user_id", userId)
        .eq("id", payload.exerciseId);

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    const { error } = await supabase.from("exercises").delete().eq("user_id", userId).eq("id", payload.exerciseId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const payload = item.payload as SyncQueueMilestonePayload;
  const { error } = await supabase.from("milestone_events").insert({
    user_id: userId,
    week_key: payload.weekKey,
    muscle_group_id: payload.muscleGroupId,
    achieved_at_iso: payload.achievedAtIso,
  });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export const workoutRepository = {
  async getBootstrapData(): Promise<{
    workouts: Workout[];
    muscleGroups: MuscleGroup[];
    exercises: Exercise[];
    isMuted: boolean;
  }> {
    const userId = await getAuthenticatedUserId();

    if (!isOnline()) {
      return getCachedBootstrapData();
    }

    const supabase = createClient();
    const [workoutsResult, muscleGroupsResult, exercisesResult, settingsData] = await Promise.all([
      supabase.from("workouts").select("*").eq("user_id", userId).order("date_iso", { ascending: true }),
      supabase.from("muscle_groups").select("*").eq("user_id", userId).order("name", { ascending: true }),
      supabase.from("exercises").select("*").eq("user_id", userId).order("name", { ascending: true }),
      getCurrentUserSettingsRow(userId),
    ]);

    if (workoutsResult.error) {
      throw new Error(workoutsResult.error.message);
    }
    if (muscleGroupsResult.error) {
      throw new Error(muscleGroupsResult.error.message);
    }
    if (exercisesResult.error) {
      throw new Error(exercisesResult.error.message);
    }
    const workouts = (workoutsResult.data ?? []).map((row) => toWorkout(row as WorkoutRow));
    const pendingWorkouts = await getPendingWorkoutEntries(userId);
    const mergedWorkouts = [...workouts, ...pendingWorkouts].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    const muscleGroups = (muscleGroupsResult.data ?? []).map((row) => toMuscleGroup(row as MuscleGroupRow));
    const exercises = (exercisesResult.data ?? []).map((row) => toExercise(row as ExerciseRow));
    const pendingExerciseMutations = await getPendingExerciseMutations(userId);
    const mergedExercises = applyPendingExerciseMutations(exercises, pendingExerciseMutations);
    const settings = settingsData ? toAppSettings(settingsData) : ({ id: "settings", isMuted: false, unit: "kg" } as AppSettings);

    await putCacheFromRemote({ workouts: mergedWorkouts, muscleGroups, exercises: mergedExercises, settings });

    return {
      workouts: mergedWorkouts,
      muscleGroups,
      exercises: mergedExercises,
      isMuted: settings.isMuted,
    };
  },

  async findSimilarExercisesForMuscleGroup(
    muscleGroupId: MuscleGroup["id"],
    name: string,
    excludeExerciseId?: string,
  ): Promise<Exercise[]> {
    const allExercises = await db.exercises.toArray();
    return findConservativeExerciseMatches({
      name,
      exercises: allExercises,
      muscleGroupId,
      excludeExerciseId,
    });
  },

  async createExercise(params: { muscleGroupId: MuscleGroup["id"]; name: string }): Promise<Exercise> {
    const userId = await getAuthenticatedUserId();
    const normalizedName = normalizeExerciseName(params.name);

    if (!normalizedName) {
      throw new Error("Exercise name is required.");
    }

    const allExercises = await db.exercises.toArray();
    const exactDuplicate = allExercises.some(
      (exercise) =>
        exercise.muscleGroupId === params.muscleGroupId && normalizeExerciseName(exercise.name) === normalizedName,
    );

    if (exactDuplicate) {
      throw new Error("An exercise with this name already exists for this body part.");
    }

    const exercise: Exercise = {
      id: createCustomExerciseId(params.muscleGroupId, normalizedName),
      muscleGroupId: params.muscleGroupId,
      name: params.name.trim(),
      isCustom: true,
    };

    if (!isOnline()) {
      await db.exercises.put(exercise);
      await queueItem({
        userId,
        status: "pending",
        entityType: "exercise",
        payload: {
          action: "create",
          exercise,
        },
        createdAtIso: nowIso(),
        nextAttemptAtIso: nowIso(),
        retries: 0,
      });
      return exercise;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .insert(toExerciseRow(userId, exercise))
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const saved = toExercise(data as ExerciseRow);
    await db.exercises.put(saved);
    return saved;
  },

  async updateExerciseName(exerciseId: string, name: string): Promise<Exercise> {
    const userId = await getAuthenticatedUserId();
    const normalizedName = normalizeExerciseName(name);

    if (!normalizedName) {
      throw new Error("Exercise name is required.");
    }

    const existing = await db.exercises.get(exerciseId);

    if (!existing) {
      throw new Error("Exercise not found.");
    }

    if (!existing.isCustom) {
      throw new Error("Default exercises cannot be renamed.");
    }

    const allExercises = await db.exercises.toArray();
    const exactDuplicate = allExercises.some(
      (exercise) =>
        exercise.id !== exerciseId &&
        exercise.muscleGroupId === existing.muscleGroupId &&
        normalizeExerciseName(exercise.name) === normalizedName,
    );

    if (exactDuplicate) {
      throw new Error("An exercise with this name already exists for this body part.");
    }

    const updatedExercise = {
      ...existing,
      name: name.trim(),
    };

    if (!isOnline()) {
      await db.exercises.put(updatedExercise);
      await queueItem({
        userId,
        status: "pending",
        entityType: "exercise",
        payload: {
          action: "update",
          exerciseId,
          name: updatedExercise.name,
        },
        createdAtIso: nowIso(),
        nextAttemptAtIso: nowIso(),
        retries: 0,
      });
      return updatedExercise;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .update({ name: updatedExercise.name })
      .eq("user_id", userId)
      .eq("id", exerciseId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const saved = toExercise(data as ExerciseRow);
    await db.exercises.put(saved);
    return saved;
  },

  async deleteExercise(exerciseId: string): Promise<void> {
    const userId = await getAuthenticatedUserId();
    const existing = await db.exercises.get(exerciseId);

    if (!existing) {
      throw new Error("Exercise not found.");
    }

    if (!existing.isCustom) {
      throw new Error("Default exercises cannot be deleted.");
    }

    const hasLocalUsage = await db.workouts.where("exerciseId").equals(exerciseId).first();

    if (hasLocalUsage) {
      throw new Error("This exercise has workout history and cannot be deleted.");
    }

    if (!isOnline()) {
      await db.exercises.delete(exerciseId);
      await queueItem({
        userId,
        status: "pending",
        entityType: "exercise",
        payload: {
          action: "delete",
          exerciseId,
        },
        createdAtIso: nowIso(),
        nextAttemptAtIso: nowIso(),
        retries: 0,
      });
      return;
    }

    const supabase = createClient();
    const usageCheck = await supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId);

    if (usageCheck.error) {
      throw new Error(usageCheck.error.message);
    }

    if ((usageCheck.count ?? 0) > 0) {
      throw new Error("This exercise has workout history and cannot be deleted.");
    }

    const { error } = await supabase.from("exercises").delete().eq("user_id", userId).eq("id", exerciseId);

    if (error) {
      throw new Error(error.message);
    }

    await db.exercises.delete(exerciseId);
  },

  async saveWorkout(workout: Workout): Promise<number> {
    const userId = await getAuthenticatedUserId();

    if (!isOnline()) {
      const localId = createLocalTempId();
      await db.workouts.put({ ...workout, id: localId });
      await queueItem({
        userId,
        status: "pending",
        entityType: "workout",
        payload: { workout, localId },
        createdAtIso: nowIso(),
        nextAttemptAtIso: nowIso(),
        retries: 0,
      });
      return localId;
    }

    const supabase = createClient();
    const { data, error } = await supabase.from("workouts").insert(toWorkoutRow(userId, workout)).select("*").single();

    if (error) {
      throw new Error(error.message);
    }

    const savedWorkout = toWorkout(data as WorkoutRow);
    await db.workouts.put(savedWorkout);
    return savedWorkout.id ?? 0;
  },

  async getWorkoutsByDateRange(startIso: string, endIso: string): Promise<Workout[]> {
    if (!isOnline()) {
      return db.workouts.where("dateIso").between(startIso, endIso, true, true).toArray();
    }

    const supabase = createClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .gte("date_iso", startIso)
      .lte("date_iso", endIso)
      .order("date_iso", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => toWorkout(row as WorkoutRow));
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
    const userId = await getAuthenticatedUserId();
    await db.appSettings.put({ id: "settings", isMuted, unit: "kg" });

    if (!isOnline()) {
      await queueItem({
        userId,
        status: "pending",
        entityType: "setting",
        payload: { isMuted },
        createdAtIso: nowIso(),
        nextAttemptAtIso: nowIso(),
        retries: 0,
      });
      return;
    }

    await upsertAppSettings({ userId, isMuted, unit: "kg", id: "settings" });
  },

  async updateMuscleGroupTarget(
    muscleGroupId: MuscleGroup["id"],
    weeklyTargetKg: number,
  ): Promise<MuscleGroup> {
    const userId = await getAuthenticatedUserId();
    const existing = await db.muscleGroups.get(muscleGroupId);

    if (!existing) {
      throw new Error("Muscle group not found.");
    }

    if (!isOnline()) {
      const next = { ...existing, weeklyTargetKg };
      await db.muscleGroups.put(next);
      await queueItem({
        userId,
        status: "pending",
        entityType: "muscleGroup",
        payload: { muscleGroupId, weeklyTargetKg },
        createdAtIso: nowIso(),
        nextAttemptAtIso: nowIso(),
        retries: 0,
      });
      return next;
    }

    const updated = await persistMuscleGroupTarget(userId, muscleGroupId, weeklyTargetKg);
    await db.muscleGroups.put(updated);
    return updated;
  },

  async createMilestoneEvent(muscleGroupId: MuscleGroup["id"]): Promise<void> {
    const userId = await getAuthenticatedUserId();
    const achievedAtIso = new Date().toISOString();
    const weekKey = getWeekKey(new Date());

    await db.milestoneEvents.put({
      id: createLocalTempId(),
      weekKey,
      muscleGroupId,
      achievedAtIso,
    });

    if (!isOnline()) {
      await queueItem({
        userId,
        status: "pending",
        entityType: "milestone",
        payload: { muscleGroupId, achievedAtIso, weekKey },
        createdAtIso: nowIso(),
        nextAttemptAtIso: nowIso(),
        retries: 0,
      });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("milestone_events").insert({
      user_id: userId,
      week_key: weekKey,
      muscle_group_id: muscleGroupId,
      achieved_at_iso: achievedAtIso,
    });

    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }
  },

  async milestoneExistsForCurrentWeek(muscleGroupId: MuscleGroup["id"]): Promise<boolean> {
    const weekKey = getWeekKey(new Date());

    if (!isOnline()) {
      const localMatch = await db.milestoneEvents
        .where("[weekKey+muscleGroupId]")
        .equals([weekKey, muscleGroupId])
        .first();
      return Boolean(localMatch);
    }

    const supabase = createClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("milestone_events")
      .select("id")
      .eq("user_id", userId)
      .eq("week_key", weekKey)
      .eq("muscle_group_id", muscleGroupId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  },

  async syncPendingChanges(): Promise<void> {
    if (!isOnline()) {
      return;
    }

    const userId = await getAuthenticatedUserId();
    const pendingItems = await getPendingQueueForUser(userId);

    for (const item of pendingItems) {
      if (!item.id) {
        continue;
      }

      await setQueueStatus(item.id, "syncing");

      try {
        await syncQueueItem(userId, item);
        await db.syncQueue.delete(item.id);
      } catch (error) {
        await setQueueStatus(item.id, "failed", asErrorMessage(error, "Sync failed"));
      }
    }
  },

  async getPendingSyncCount(): Promise<number> {
    const userId = await getAuthenticatedUserId();
    const pendingItems = await getPendingQueueForUser(userId);
    return pendingItems.length;
  },

  async getSyncQueueStatus(): Promise<{ queuedCount: number; failedCount: number; syncingCount: number }> {
    const userId = await getAuthenticatedUserId();
    const records = await db.syncQueue.where("userId").equals(userId).toArray();

    const queuedCount = records.filter(
      (record) => record.status === "pending" || record.status === "failed" || record.status === "syncing",
    ).length;
    const failedCount = records.filter((record) => record.status === "failed").length;
    const syncingCount = records.filter((record) => record.status === "syncing").length;

    return { queuedCount, failedCount, syncingCount };
  },

  async buildUserExportPayload(): Promise<ExportPayload> {
    if (!isOnline()) {
      const [workouts, milestoneEvents, appSettings, muscleGroups, exercises] = await Promise.all([
        db.workouts.toArray(),
        db.milestoneEvents.toArray(),
        db.appSettings.toArray(),
        db.muscleGroups.toArray(),
        db.exercises.toArray(),
      ]);

      return {
        schemaVersion: 1,
        exportedAtIso: new Date().toISOString(),
        data: {
          workouts,
          milestoneEvents,
          appSettings,
          muscleGroups,
          exercises,
        },
      };
    }

    const supabase = createClient();
    const userId = await getAuthenticatedUserId();

    const [workoutsResult, milestoneEventsResult, appSettingsRows, muscleGroupsResult, exercisesResult] =
      await Promise.all([
        supabase.from("workouts").select("*").eq("user_id", userId).order("date_iso", { ascending: true }),
        supabase
          .from("milestone_events")
          .select("*")
          .eq("user_id", userId)
          .order("achieved_at_iso", { ascending: true }),
        getCurrentUserSettingsRows(userId),
        supabase.from("muscle_groups").select("*").eq("user_id", userId).order("name", { ascending: true }),
        supabase.from("exercises").select("*").eq("user_id", userId).order("name", { ascending: true }),
      ]);

    if (workoutsResult.error) {
      throw new Error(workoutsResult.error.message);
    }
    if (milestoneEventsResult.error) {
      throw new Error(milestoneEventsResult.error.message);
    }
    if (muscleGroupsResult.error) {
      throw new Error(muscleGroupsResult.error.message);
    }
    if (exercisesResult.error) {
      throw new Error(exercisesResult.error.message);
    }

    return {
      schemaVersion: 1,
      exportedAtIso: new Date().toISOString(),
      data: {
        workouts: (workoutsResult.data ?? []).map((row) => toWorkout(row as WorkoutRow)),
        milestoneEvents: (milestoneEventsResult.data ?? []).map((row) => toMilestoneEvent(row as MilestoneEventRow)),
        appSettings: appSettingsRows.map((row) => toAppSettings(row)),
        muscleGroups: (muscleGroupsResult.data ?? []).map((row) => toMuscleGroup(row as MuscleGroupRow)),
        exercises: (exercisesResult.data ?? []).map((row) => toExercise(row as ExerciseRow)),
      },
    };
  },

  async replaceAllUserData(data: ExportPayload["data"]): Promise<void> {
    if (!isOnline()) {
      throw new Error("Import requires internet connection so data can be written to your Supabase account.");
    }

    const supabase = createClient();
    const userId = await getAuthenticatedUserId();

    const deletes = [
      supabase.from("workouts").delete().eq("user_id", userId),
      supabase.from("milestone_events").delete().eq("user_id", userId),
      supabase.from("exercises").delete().eq("user_id", userId),
      supabase.from("muscle_groups").delete().eq("user_id", userId),
      supabase.from("app_settings").delete().eq("user_id", userId),
    ];

    const deleteResults = await Promise.all(deletes);
    for (const result of deleteResults) {
      if (result.error) {
        throw new Error(result.error.message);
      }
    }

    if (data.muscleGroups.length > 0) {
      const { error } = await supabase.from("muscle_groups").insert(
        data.muscleGroups.map((group) => ({
          user_id: userId,
          id: group.id,
          name: group.name,
          weekly_target_kg: group.weeklyTargetKg,
          accent_color: group.accentColor,
        })),
      );

      if (error) {
        throw new Error(error.message);
      }
    }

    if (data.exercises.length > 0) {
      const { error } = await supabase.from("exercises").insert(
        data.exercises.map((exercise) => ({
          user_id: userId,
          id: exercise.id,
          name: exercise.name,
          muscle_group_id: exercise.muscleGroupId,
          is_custom: exercise.isCustom ?? false,
        })),
      );

      if (error) {
        throw new Error(error.message);
      }
    }

    if (data.workouts.length > 0) {
      const { error } = await supabase.from("workouts").insert(
        data.workouts.map((workout) => ({
          user_id: userId,
          date_iso: workout.dateIso,
          muscle_group_id: workout.muscleGroupId,
          exercise_id: workout.exerciseId,
          sets: workout.sets,
          notes: workout.notes ?? null,
          created_at_iso: workout.createdAtIso,
        })),
      );

      if (error) {
        throw new Error(error.message);
      }
    }

    if (data.milestoneEvents.length > 0) {
      const { error } = await supabase.from("milestone_events").insert(
        data.milestoneEvents.map((event) => ({
          user_id: userId,
          week_key: event.weekKey,
          muscle_group_id: event.muscleGroupId,
          achieved_at_iso: event.achievedAtIso,
        })),
      );

      if (error) {
        throw new Error(error.message);
      }
    }

    const importedSettings = data.appSettings[0] ?? { id: "settings", isMuted: false, unit: "kg" };
    await upsertAppSettings({
      userId,
      id: importedSettings.id,
      isMuted: importedSettings.isMuted,
      unit: importedSettings.unit,
    });
  },

  asErrorMessage,

  async getAuthenticatedUserId(): Promise<string> {
    return getAuthenticatedUserId();
  },
};

