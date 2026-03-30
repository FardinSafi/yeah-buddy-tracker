import Dexie, { type Table } from "dexie";
import type { AppSettings, Exercise, MilestoneEvent, MuscleGroup, Workout } from "@/types/domain";

export class YeahBuddyDatabase extends Dexie {
  workouts!: Table<Workout, number>;
  exercises!: Table<Exercise, string>;
  muscleGroups!: Table<MuscleGroup, string>;
  appSettings!: Table<AppSettings, string>;
  milestoneEvents!: Table<MilestoneEvent, number>;

  constructor() {
    super("yeahBuddyTrackerDb");

    this.version(1).stores({
      workouts: "++id, dateIso, muscleGroupId, exerciseId",
      exercises: "id, muscleGroupId, name",
      muscleGroups: "id, name",
      appSettings: "id",
      milestoneEvents: "++id, weekKey, muscleGroupId, [weekKey+muscleGroupId]",
    });

  }
}

export const db = new YeahBuddyDatabase();
