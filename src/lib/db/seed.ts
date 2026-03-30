import { DEFAULT_EXERCISES } from "@/data/exercises";
import { DEFAULT_MUSCLE_GROUPS } from "@/data/muscle-groups";
import { createClient } from "@/lib/supabase/client";

function isMissingAppSettingsIdColumn(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("app_settings.id") ||
    normalized.includes("could not find the 'id' column") ||
    normalized.includes("column id does not exist")
  );
}

export async function ensureSeedData(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("ensure_current_user_initialized");

  if (!error) {
    return;
  }

  const message = error.message.toLowerCase();
  if (message.includes("not authenticated") || message.includes("signed in")) {
    throw new Error("You must be signed in to seed user data.");
  }

  // Temporary fallback if migration wasn't applied yet.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to seed user data.");
  }

  const userId = user.id;

  const [{ count: muscleGroupCount, error: muscleGroupError }, { count: exerciseCount, error: exerciseError }] =
    await Promise.all([
      supabase.from("muscle_groups").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("exercises").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

  if (muscleGroupError) {
    throw new Error(muscleGroupError.message);
  }
  if (exerciseError) {
    throw new Error(exerciseError.message);
  }

  if ((muscleGroupCount ?? 0) === 0) {
    const { error: insertMuscleGroupError } = await supabase.from("muscle_groups").insert(
      DEFAULT_MUSCLE_GROUPS.map((group) => ({
        user_id: userId,
        id: group.id,
        name: group.name,
        weekly_target_kg: group.weeklyTargetKg,
        accent_color: group.accentColor,
      })),
    );

    if (insertMuscleGroupError) {
      throw new Error(insertMuscleGroupError.message);
    }
  }

  if ((exerciseCount ?? 0) === 0) {
    const { error: insertExerciseError } = await supabase.from("exercises").insert(
      DEFAULT_EXERCISES.map((exercise) => ({
        user_id: userId,
        id: exercise.id,
        name: exercise.name,
        muscle_group_id: exercise.muscleGroupId,
      })),
    );

    if (insertExerciseError) {
      throw new Error(insertExerciseError.message);
    }
  }

  const { error: settingsError } = await supabase.from("app_settings").upsert(
    {
      id: "settings",
      user_id: userId,
      is_muted: false,
      unit: "kg",
    },
    { onConflict: "user_id,id" },
  );

  if (settingsError) {
    if (!isMissingAppSettingsIdColumn(settingsError.message)) {
      throw new Error(settingsError.message);
    }

    const { error: legacySettingsError } = await supabase.from("app_settings").upsert(
      {
        user_id: userId,
        is_muted: false,
        unit: "kg",
      },
      { onConflict: "user_id" },
    );

    if (legacySettingsError) {
      throw new Error(
        `Supabase schema is out of date for app_settings.id. Apply migration 202603310001_enforce_settings_id_and_initialize_users.sql. Details: ${legacySettingsError.message}`,
      );
    }
  }
}
