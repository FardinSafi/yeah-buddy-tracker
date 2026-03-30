"use client";

import type { MuscleGroup, MuscleGroupId } from "@/types/domain";

type MuscleGroupStepProps = {
  muscleGroups: MuscleGroup[];
  selectedId?: MuscleGroupId;
  onSelect: (id: MuscleGroupId) => void;
};

export function MuscleGroupStep({ muscleGroups, selectedId, onSelect }: MuscleGroupStepProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {muscleGroups.map((group) => {
        const selected = selectedId === group.id;
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect(group.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selected
                ? "border-[#d4af37] bg-[#1a160b]"
                : "border-[#2a2a2a] bg-[#111111] hover:border-[#574720]"
            }`}
          >
            <p className="text-lg font-semibold text-[#f4e3b1]">{group.name}</p>
            <p className="text-sm text-[#a3a3a3]">Target: {group.weeklyTargetKg.toLocaleString()} kg / week</p>
          </button>
        );
      })}
    </div>
  );
}
