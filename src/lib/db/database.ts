import Dexie, { type Table } from "dexie";
import type { AppSettings, Exercise, MilestoneEvent, MuscleGroup, Workout } from "@/types/domain";

export type SyncQueueStatus = "pending" | "syncing" | "failed";
export type SyncEntityType = "workout" | "milestone" | "setting";

export type SyncQueueWorkoutPayload = {
  workout: Workout;
  localId?: number;
};

export type SyncQueueMilestonePayload = {
  muscleGroupId: MuscleGroup["id"];
  achievedAtIso: string;
  weekKey: string;
};

export type SyncQueueSettingPayload = {
  isMuted: boolean;
};

export type SyncQueuePayload =
  | SyncQueueWorkoutPayload
  | SyncQueueMilestonePayload
  | SyncQueueSettingPayload;

export type SyncQueueItem = {
  id?: number;
  userId: string;
  status: SyncQueueStatus;
  entityType: SyncEntityType;
  payload: SyncQueuePayload;
  createdAtIso: string;
  nextAttemptAtIso?: string;
  retries: number;
  lastError?: string;
};

export class YeahBuddyDatabase extends Dexie {
  workouts!: Table<Workout, number>;
  exercises!: Table<Exercise, string>;
  muscleGroups!: Table<MuscleGroup, string>;
  appSettings!: Table<AppSettings, string>;
  milestoneEvents!: Table<MilestoneEvent, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("yeahBuddyTrackerDb");

    this.version(1).stores({
      workouts: "++id, dateIso, muscleGroupId, exerciseId",
      exercises: "id, muscleGroupId, name",
      muscleGroups: "id, name",
      appSettings: "id",
      milestoneEvents: "++id, weekKey, muscleGroupId, [weekKey+muscleGroupId]",
    });

    this.version(2).stores({
      workouts: "++id, dateIso, muscleGroupId, exerciseId",
      exercises: "id, muscleGroupId, name",
      muscleGroups: "id, name",
      appSettings: "id",
      milestoneEvents: "++id, weekKey, muscleGroupId, [weekKey+muscleGroupId]",
      syncQueue: "++id, userId, status, entityType, createdAtIso, [userId+status]",
    });

    this.version(3).stores({
      workouts: "++id, dateIso, muscleGroupId, exerciseId",
      exercises: "id, muscleGroupId, name",
      muscleGroups: "id, name",
      appSettings: "id",
      milestoneEvents: "++id, weekKey, muscleGroupId, [weekKey+muscleGroupId]",
      syncQueue: "++id, userId, status, entityType, createdAtIso, nextAttemptAtIso, [userId+status]",
    });

  }
}

export const db = new YeahBuddyDatabase();
