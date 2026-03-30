export const MUSCLE_GROUP_IDS = ["chest", "back", "shoulders", "legs", "arms"] as const;

export type MuscleGroupId = (typeof MUSCLE_GROUP_IDS)[number];

export type MuscleGroup = {
  id: MuscleGroupId;
  name: string;
  weeklyTargetKg: number;
  accentColor: string;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroupId: MuscleGroupId;
};

export type WorkoutSet = {
  reps: number;
  weightKg: number;
};

export type Workout = {
  id?: number;
  dateIso: string;
  muscleGroupId: MuscleGroupId;
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string;
  createdAtIso: string;
};

export type AppSettings = {
  id: "settings";
  isMuted: boolean;
  unit: "kg";
};

export type MilestoneEvent = {
  id?: number;
  weekKey: string;
  muscleGroupId: MuscleGroupId;
  achievedAtIso: string;
};

export type WeeklyStat = {
  muscleGroupId: MuscleGroupId;
  name: string;
  tonnageKg: number;
  targetKg: number;
  percent: number;
  completed: boolean;
};

export type ExportPayload = {
  schemaVersion: 1;
  exportedAtIso: string;
  data: {
    workouts: Workout[];
    milestoneEvents: MilestoneEvent[];
    appSettings: AppSettings[];
    muscleGroups: MuscleGroup[];
    exercises: Exercise[];
  };
};
