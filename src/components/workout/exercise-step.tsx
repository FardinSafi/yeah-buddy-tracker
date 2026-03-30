"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Exercise, MuscleGroupId } from "@/types/domain";

type ExerciseStepProps = {
  exercises: Exercise[];
  muscleGroupId: MuscleGroupId;
  query: string;
  selectedExerciseId?: string;
  onQueryChange: (query: string) => void;
  onSelect: (exerciseId: string) => void;
};

export function ExerciseStep({
  exercises,
  muscleGroupId,
  query,
  selectedExerciseId,
  onQueryChange,
  onSelect,
}: ExerciseStepProps) {
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return exercises
      .filter((exercise) => exercise.muscleGroupId === muscleGroupId)
      .filter((exercise) => exercise.name.toLowerCase().includes(normalized));
  }, [exercises, muscleGroupId, query]);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search exercise"
        className="h-12 border-[#2f2f2f] bg-[#101010] text-[#f5f5f5]"
      />
      <div className="max-h-[50vh] space-y-2 overflow-auto pr-1">
        {filtered.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => onSelect(exercise.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
              selectedExerciseId === exercise.id
                ? "border-[#d4af37] bg-[#1a160b] text-[#f4e3b1]"
                : "border-[#2a2a2a] bg-[#111111] text-[#d4d4d4] hover:border-[#574720]"
            }`}
          >
            {exercise.name}
          </button>
        ))}
      </div>
    </div>
  );
}
