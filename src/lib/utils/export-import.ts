import { db } from "@/lib/db/database";
import type { ExportPayload } from "@/types/domain";

export async function buildExportPayload(): Promise<ExportPayload> {
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

export function downloadJsonFile(payload: ExportPayload, fileName = "yeah-buddy-tracker-export.json"): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function importFromJsonText(jsonText: string): Promise<void> {
  const payload = JSON.parse(jsonText) as Partial<ExportPayload>;

  if (payload.schemaVersion !== 1 || !payload.data) {
    throw new Error("Unsupported export format.");
  }

  const data = payload.data;

  await db.transaction(
    "rw",
    [db.workouts, db.milestoneEvents, db.appSettings, db.muscleGroups, db.exercises],
    async () => {
      await Promise.all([
        db.workouts.clear(),
        db.milestoneEvents.clear(),
        db.appSettings.clear(),
        db.muscleGroups.clear(),
        db.exercises.clear(),
      ]);

      if (data.workouts) {
        await db.workouts.bulkPut(data.workouts);
      }
      if (data.milestoneEvents) {
        await db.milestoneEvents.bulkPut(data.milestoneEvents);
      }
      if (data.appSettings) {
        await db.appSettings.bulkPut(data.appSettings);
      }
      if (data.muscleGroups) {
        await db.muscleGroups.bulkPut(data.muscleGroups);
      }
      if (data.exercises) {
        await db.exercises.bulkPut(data.exercises);
      }
    },
  );
}
