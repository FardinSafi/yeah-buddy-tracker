import type { MuscleGroup } from "@/types/domain";

export const DEFAULT_MUSCLE_GROUPS: MuscleGroup[] = [
  { id: "chest", name: "Chest", weeklyTargetKg: 25000, accentColor: "#D4AF37" },
  { id: "back", name: "Back", weeklyTargetKg: 35000, accentColor: "#B91C1C" },
  { id: "shoulders", name: "Shoulders", weeklyTargetKg: 18000, accentColor: "#D4AF37" },
  { id: "legs", name: "Legs", weeklyTargetKg: 40000, accentColor: "#B91C1C" },
  { id: "arms", name: "Arms", weeklyTargetKg: 15000, accentColor: "#D4AF37" },
];
