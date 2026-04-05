"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ExerciseStep } from "@/components/workout/exercise-step";
import { MuscleGroupStep } from "@/components/workout/muscle-group-step";
import { SetsStep } from "@/components/workout/sets-step";
import { useWorkoutStore } from "@/store/workout-store";
import type { MuscleGroupId, WorkoutSet } from "@/types/domain";

const DEFAULT_SET: WorkoutSet = { reps: 10, weightKg: 20 };

type WorkoutLoggerProps = {
  initialMuscleGroupId?: MuscleGroupId;
};

export function WorkoutLogger({ initialMuscleGroupId }: WorkoutLoggerProps) {
  const router = useRouter();
  const muscleGroups = useWorkoutStore((state) => state.muscleGroups);
  const exercises = useWorkoutStore((state) => state.exercises);
  const saveWorkout = useWorkoutStore((state) => state.saveWorkout);
  const isSaving = useWorkoutStore((state) => state.isSaving);

  const [step, setStep] = useState(initialMuscleGroupId ? 2 : 1);
  const [muscleGroupId, setMuscleGroupId] = useState<MuscleGroupId | undefined>(initialMuscleGroupId);
  const [exerciseId, setExerciseId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [sets, setSets] = useState<WorkoutSet[]>([{ ...DEFAULT_SET }]);
  const [notes, setNotes] = useState("");

  const selectedExerciseName = useMemo(() => {
    return exercises.find((exercise) => exercise.id === exerciseId)?.name ?? "";
  }, [exerciseId, exercises]);

  function updateSet(index: number, key: "reps" | "weightKg", value: number) {
    setSets((prev) =>
      prev.map((set, setIndex) => (setIndex === index ? { ...set, [key]: Number.isFinite(value) ? value : 0 } : set)),
    );
  }

  async function handleSave() {
    if (!muscleGroupId || !exerciseId) {
      return;
    }

    await saveWorkout({
      muscleGroupId,
      exerciseId,
      sets: sets.filter((set) => set.reps > 0 && set.weightKg >= 0),
      notes,
    });

    router.push("/");
  }

  const canGoNext =
    (step === 1 && Boolean(muscleGroupId)) ||
    (step === 2 && Boolean(exerciseId)) ||
    (step === 3 && sets.some((set) => set.reps > 0));

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4 pb-10">
      <div className="rounded-2xl border border-[#352f1e] bg-[#14120c] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Log Today&apos;s Workout</p>
        {selectedExerciseName ? <p className="mt-1 text-sm text-[#b5b5b5]">{selectedExerciseName}</p> : null}
      </div>

      <div className="rounded-2xl border border-[#2b2b2b] bg-[#0f0f0f] p-4">
        {step === 1 ? (
          <MuscleGroupStep
            muscleGroups={muscleGroups}
            selectedId={muscleGroupId}
            onSelect={(id) => {
              setMuscleGroupId(id);
              setExerciseId(undefined);
              setSearchQuery("");
            }}
          />
        ) : null}

        {step === 2 && muscleGroupId ? (
          <ExerciseStep
            exercises={exercises}
            muscleGroupId={muscleGroupId}
            query={searchQuery}
            selectedExerciseId={exerciseId}
            onQueryChange={setSearchQuery}
            onSelect={setExerciseId}
          />
        ) : null}

        {step === 3 ? (
          <SetsStep
            sets={sets}
            notes={notes}
            onAddSet={() => setSets((prev) => [...prev, { ...DEFAULT_SET }])}
            onRemoveSet={(index) => setSets((prev) => prev.filter((_, setIndex) => setIndex !== index))}
            onSetChange={updateSet}
            onNotesChange={setNotes}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => (step === 1 ? router.push("/") : setStep((current) => current - 1))}
          className="h-12 border-[#3a3a3a] bg-[#101010] text-[#ddd]"
        >
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step < 3 ? (
          <Button
            type="button"
            onClick={() => canGoNext && setStep((current) => current + 1)}
            disabled={!canGoNext}
            className="h-12 bg-[#d4af37] font-bold text-[#121212] hover:bg-[#bf9b29]"
          >
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canGoNext || isSaving}
            className="h-12 bg-[#d4af37] font-bold text-[#121212] hover:bg-[#bf9b29]"
          >
            {isSaving ? "Saving..." : "Save Workout"}
          </Button>
        )}
      </div>
    </div>
  );
}
