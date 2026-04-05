"use client";

import { LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { WorkoutLogger } from "@/components/workout/workout-logger";
import { useWorkoutStore } from "@/store/workout-store";
import { MUSCLE_GROUP_IDS, type MuscleGroupId } from "@/types/domain";

export default function WorkoutLogPage() {
  const initialized = useWorkoutStore((state) => state.initialized);
  const searchParams = useSearchParams();
  const muscleGroupIdParam = searchParams.get("muscleGroupId");
  const initialMuscleGroupId = MUSCLE_GROUP_IDS.includes(muscleGroupIdParam as MuscleGroupId)
    ? (muscleGroupIdParam as MuscleGroupId)
    : undefined;

  if (!initialized) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center p-6">
        <div className="flex items-center gap-2 text-[#d4af37]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-lg">Preparing workout logger...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1c1508_0%,_#0a0a0a_45%)]">
      <WorkoutLogger initialMuscleGroupId={initialMuscleGroupId} />
    </main>
  );
}
