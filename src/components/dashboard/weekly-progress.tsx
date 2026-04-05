"use client";

import { ProgressRing } from "@/components/dashboard/progress-ring";
import { useWorkoutStore } from "@/store/workout-store";

export function WeeklyProgress() {
  const stats = useWorkoutStore((state) => state.weeklyStats);
  const muscleGroups = useWorkoutStore((state) => state.muscleGroups);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-[0.2em] text-[#d4af37] uppercase">Weekly Progress</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const group = muscleGroups.find((item) => item.id === stat.muscleGroupId);
          return (
            <ProgressRing
              key={stat.muscleGroupId}
              name={stat.name}
              tonnageKg={stat.tonnageKg}
              targetKg={stat.targetKg}
              percent={stat.percent}
              accentColor={group?.accentColor ?? "#D4AF37"}
              href={`/workout-log?muscleGroupId=${stat.muscleGroupId}`}
            />
          );
        })}
      </div>
    </section>
  );
}
