"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Exercise, MuscleGroupId } from "@/types/domain";

type TodayLoggedExerciseSummary = {
  exerciseId: string;
  exerciseName: string;
  count: number;
};

type ExerciseStepProps = {
  exercises: Exercise[];
  muscleGroupId: MuscleGroupId;
  query: string;
  selectedExerciseId?: string;
  todayLoggedExercises: TodayLoggedExerciseSummary[];
  onQueryChange: (query: string) => void;
  onSelect: (exerciseId: string) => void;
};

export function ExerciseStep({
  exercises,
  muscleGroupId,
  query,
  selectedExerciseId,
  todayLoggedExercises,
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
      {todayLoggedExercises.length > 0 ? (
        <div className="rounded-xl border border-[#4b3a14] bg-[#1a160b] p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Already logged today</p>
          <div className="mt-3 space-y-2">
            {todayLoggedExercises.map((exercise) => (
              <div
                key={exercise.exerciseId}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#3b3120] bg-[#111111] px-3 py-2"
              >
                <span className="text-sm font-medium text-[#f4e3b1]">{exercise.exerciseName}</span>
                <span className="rounded-full border border-[#5f4d20] bg-[#201a0a] px-2 py-0.5 text-xs font-semibold text-[#e0c46b]">
                  {exercise.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
