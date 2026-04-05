"use client";

import { useState } from "react";
import { Check, PencilLine, X } from "lucide-react";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkoutStore } from "@/store/workout-store";
import type { MuscleGroupId } from "@/types/domain";

export function WeeklyProgress() {
  const stats = useWorkoutStore((state) => state.weeklyStats);
  const muscleGroups = useWorkoutStore((state) => state.muscleGroups);
  const updateMuscleGroupTarget = useWorkoutStore((state) => state.updateMuscleGroupTarget);

  const [editingMuscleGroupId, setEditingMuscleGroupId] = useState<MuscleGroupId | null>(null);
  const [draftTargetKg, setDraftTargetKg] = useState("");
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  async function handleEditStart(muscleGroupId: MuscleGroupId, currentTargetKg: number) {
    setEditingMuscleGroupId(muscleGroupId);
    setDraftTargetKg(String(currentTargetKg));
  }

  async function handleTargetSave(muscleGroupId: MuscleGroupId) {
    const nextTargetKg = Number(draftTargetKg);
    if (!Number.isFinite(nextTargetKg) || nextTargetKg < 0) {
      return;
    }

    setIsSavingTarget(true);
    try {
      await updateMuscleGroupTarget(muscleGroupId, nextTargetKg);
      setEditingMuscleGroupId(null);
    } catch (error) {
      console.error("Failed to update muscle group target:", error);
    } finally {
      setIsSavingTarget(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-[0.2em] text-[#d4af37] uppercase">Weekly Progress</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const group = muscleGroups.find((item) => item.id === stat.muscleGroupId);
          const isEditing = editingMuscleGroupId === stat.muscleGroupId;
          return (
            <div key={stat.muscleGroupId} className="space-y-2">
              <div className="relative">
                <ProgressRing
                  name={stat.name}
                  tonnageKg={stat.tonnageKg}
                  targetKg={stat.targetKg}
                  percent={stat.percent}
                  accentColor={group?.accentColor ?? "#D4AF37"}
                  href={`/workout-log?muscleGroupId=${stat.muscleGroupId}`}
                />
                <button
                  type="button"
                  onClick={() => void handleEditStart(stat.muscleGroupId, stat.targetKg)}
                  className="absolute right-2 top-2 rounded-full border border-[#3a3a3a] bg-[#0e0e0e] p-2 text-[#d4af37] shadow-sm transition hover:border-[#d4af37] hover:bg-[#151515]"
                  aria-label={`Edit ${stat.name} weekly target`}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                </button>
              </div>

              {isEditing ? (
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#b8b8b8]">Adjust weekly target</p>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={draftTargetKg}
                    onChange={(event) => setDraftTargetKg(event.target.value)}
                    className="mt-2 h-11 border-[#2f2f2f] bg-[#0f0f0f] text-[#f5f5f5]"
                  />
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      onClick={() => void handleTargetSave(stat.muscleGroupId)}
                      disabled={isSavingTarget}
                      className="h-10 flex-1 bg-[#d4af37] font-semibold text-[#121212] hover:bg-[#bf9b29]"
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingMuscleGroupId(null)}
                      className="h-10 flex-1 border-[#3a3a3a] bg-[#0f0f0f] text-[#ddd] hover:bg-[#1a1a1a]"
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
