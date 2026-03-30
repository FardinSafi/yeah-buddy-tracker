"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { calculateWorkoutTonnage } from "@/lib/utils/tonnage";
import type { WorkoutSet } from "@/types/domain";

type SetsStepProps = {
  sets: WorkoutSet[];
  notes: string;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  onSetChange: (index: number, key: "reps" | "weightKg", value: number) => void;
  onNotesChange: (value: string) => void;
};

export function SetsStep({
  sets,
  notes,
  onAddSet,
  onRemoveSet,
  onSetChange,
  onNotesChange,
}: SetsStepProps) {
  const runningTonnage = calculateWorkoutTonnage(sets);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#2b2413] bg-[#15120b] p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Running Tonnage</p>
        <p className="text-xl font-bold text-[#f4e3b1]">{runningTonnage.toLocaleString()} kg</p>
      </div>

      {sets.map((set, index) => (
        <div key={`set-${index}`} className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#f0f0f0]">Set {index + 1}</p>
            {sets.length > 1 && (
              <button type="button" onClick={() => onRemoveSet(index)} className="text-[#cfcfcf]">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={1}
              value={set.reps}
              onChange={(event) => onSetChange(index, "reps", Number(event.target.value))}
              placeholder="Reps"
              className="h-11 border-[#333] bg-[#0e0e0e]"
            />
            <Input
              type="number"
              min={0}
              step={0.5}
              value={set.weightKg}
              onChange={(event) => onSetChange(index, "weightKg", Number(event.target.value))}
              placeholder="Weight (kg)"
              className="h-11 border-[#333] bg-[#0e0e0e]"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddSet}
        className="h-12 w-full rounded-xl border border-[#5a4820] bg-[#1a160d] font-semibold text-[#f4e3b1]"
      >
        Add Set
      </button>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.2em] text-[#b5b5b5]">Notes (Optional)</label>
        <Textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="How did this feel?"
          className="min-h-24 border-[#2f2f2f] bg-[#101010]"
        />
      </div>
    </div>
  );
}
