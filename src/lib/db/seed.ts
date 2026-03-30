import { DEFAULT_EXERCISES } from "@/data/exercises";
import { DEFAULT_MUSCLE_GROUPS } from "@/data/muscle-groups";
import { db } from "@/lib/db/database";

export async function ensureSeedData(): Promise<void> {
  const [muscleGroupCount, exerciseCount, settings] = await Promise.all([
    db.muscleGroups.count(),
    db.exercises.count(),
    db.appSettings.get("settings"),
  ]);

  if (muscleGroupCount === 0) {
    await db.muscleGroups.bulkPut(DEFAULT_MUSCLE_GROUPS);
  }

  if (exerciseCount === 0) {
    await db.exercises.bulkPut(DEFAULT_EXERCISES);
  }

  if (!settings) {
    await db.appSettings.put({ id: "settings", isMuted: false, unit: "kg" });
  }
}
