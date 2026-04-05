"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkoutStore } from "@/store/workout-store";
import type { Exercise, MuscleGroupId } from "@/types/domain";

type ExerciseLibraryProps = {
  initialMuscleGroupId?: MuscleGroupId;
  mode?: "full" | "add-only";
  onExerciseAdded?: (exerciseId: string) => void;
};

export function ExerciseLibrary({ initialMuscleGroupId, mode = "full", onExerciseAdded }: ExerciseLibraryProps) {
  const exercises = useWorkoutStore((state) => state.exercises);
  const muscleGroups = useWorkoutStore((state) => state.muscleGroups);
  const findSimilarExercises = useWorkoutStore((state) => state.findSimilarExercises);
  const createExercise = useWorkoutStore((state) => state.createExercise);
  const updateExerciseName = useWorkoutStore((state) => state.updateExerciseName);
  const deleteExercise = useWorkoutStore((state) => state.deleteExercise);

  const [muscleGroupId, setMuscleGroupId] = useState<MuscleGroupId | "">(initialMuscleGroupId ?? "");
  const [query, setQuery] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [similarExercises, setSimilarExercises] = useState<Exercise[]>([]);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const filteredExercises = useMemo(() => {
    if (!muscleGroupId) {
      return [];
    }

    const normalized = query.trim().toLowerCase();
    return exercises
      .filter((exercise) => exercise.muscleGroupId === muscleGroupId)
      .filter((exercise) => exercise.name.toLowerCase().includes(normalized))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, muscleGroupId, query]);

  async function submitCreate(confirmed: boolean) {
    if (!muscleGroupId) {
      setStatusMessage("Select a body part first.");
      return;
    }

    const trimmedName = newExerciseName.trim();
    if (!trimmedName) {
      setStatusMessage("Enter an exercise name.");
      return;
    }

    setIsWorking(true);
    setStatusMessage(null);

    try {
      if (!confirmed) {
        const matches = await findSimilarExercises(muscleGroupId, trimmedName);
        setSimilarExercises(matches);
        if (matches.length > 0) {
          setRequiresConfirmation(true);
          return;
        }
      }

      const created = await createExercise(muscleGroupId, trimmedName);
      setNewExerciseName("");
      setQuery("");
      setSimilarExercises([]);
      setRequiresConfirmation(false);
      setStatusMessage(`Added ${created.name}.`);
      onExerciseAdded?.(created.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add exercise.";
      setStatusMessage(message);
    } finally {
      setIsWorking(false);
    }
  }

  async function handleRename(exerciseId: string) {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setStatusMessage("Exercise name is required.");
      return;
    }

    setIsWorking(true);
    setStatusMessage(null);

    try {
      await updateExerciseName(exerciseId, trimmedName);
      setEditingExerciseId(null);
      setEditingName("");
      setStatusMessage("Exercise updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update exercise.";
      setStatusMessage(message);
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDelete(exerciseId: string, exerciseName: string) {
    const approved = window.confirm(`Delete ${exerciseName}? This cannot be undone.`);
    if (!approved) {
      return;
    }

    setIsWorking(true);
    setStatusMessage(null);

    try {
      await deleteExercise(exerciseId);
      setStatusMessage("Exercise deleted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete exercise.";
      setStatusMessage(message);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
      {mode === "full" ? <p className="text-xs uppercase tracking-[0.2em] text-[#b8b8b8]">Exercise Library</p> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {muscleGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setMuscleGroupId(group.id)}
            className={`rounded-xl border px-3 py-2 text-sm transition ${
              muscleGroupId === group.id
                ? "border-[#d4af37] bg-[#1a160b] text-[#f4e3b1]"
                : "border-[#2a2a2a] bg-[#0f0f0f] text-[#d4d4d4] hover:border-[#574720]"
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Input
          value={newExerciseName}
          onChange={(event) => {
            setNewExerciseName(event.target.value);
            setRequiresConfirmation(false);
            setSimilarExercises([]);
          }}
          placeholder="New exercise name"
          className="h-12 border-[#2f2f2f] bg-[#101010] text-[#f5f5f5]"
        />

        {similarExercises.length > 0 ? (
          <div className="rounded-xl border border-[#4b3a14] bg-[#1a160b] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Similar exercises already exist</p>
            <div className="mt-2 space-y-2">
              {similarExercises.map((exercise) => (
                <p key={exercise.id} className="text-sm text-[#f4e3b1]">
                  {exercise.name}
                </p>
              ))}
            </div>
            {requiresConfirmation ? (
              <div className="mt-3 rounded-lg border border-[#5f4d20] bg-[#14120c] p-3">
                <p className="text-sm text-[#d4d4d4]">Is this exercise different from the ones listed above?</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void submitCreate(true)}
                    disabled={isWorking}
                    className="h-10 bg-[#d4af37] font-semibold text-[#121212] hover:bg-[#bf9b29]"
                  >
                    Yes, Add Exercise
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRequiresConfirmation(false);
                      setStatusMessage("Addition cancelled.");
                    }}
                    className="h-10 border-[#3d3d3d] bg-[#0f0f0f] text-[#ddd]"
                  >
                    No
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => void submitCreate(false)}
          disabled={isWorking || !muscleGroupId || !newExerciseName.trim()}
          className="h-11 bg-[#d4af37] font-bold text-[#121212] hover:bg-[#bf9b29] disabled:opacity-50"
        >
          {isWorking ? "Working..." : "Check & Add Exercise"}
        </Button>
      </div>

      {mode === "full" ? (
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises"
            className="h-11 border-[#2f2f2f] bg-[#101010] text-[#f5f5f5]"
          />

          <div className="max-h-[40vh] space-y-2 overflow-auto pr-1">
            {filteredExercises.map((exercise) => {
              const isEditing = editingExerciseId === exercise.id;
              const canManage = Boolean(exercise.isCustom);

              return (
                <div
                  key={exercise.id}
                  className="rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-3"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="h-10 border-[#2f2f2f] bg-[#101010] text-[#f5f5f5]"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => void handleRename(exercise.id)}
                          disabled={isWorking}
                          className="h-9 bg-[#d4af37] text-[#121212] hover:bg-[#bf9b29]"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingExerciseId(null);
                            setEditingName("");
                          }}
                          className="h-9 border-[#3d3d3d] bg-[#0f0f0f] text-[#ddd]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[#f4e3b1]">{exercise.name}</p>
                        <p className="text-xs text-[#8a8a8a]">{exercise.isCustom ? "Custom" : "Default"}</p>
                      </div>
                      {canManage ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingExerciseId(exercise.id);
                              setEditingName(exercise.name);
                            }}
                            className="h-8 border-[#3d3d3d] bg-[#0f0f0f] px-3 text-xs text-[#ddd]"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handleDelete(exercise.id, exercise.name)}
                            className="h-8 border-[#5b2b2b] bg-[#1b1111] px-3 text-xs text-[#f3b9b9]"
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {statusMessage ? <p className="text-sm text-[#d4d4d4]">{statusMessage}</p> : null}
    </section>
  );
}
