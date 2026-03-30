"use client";

import { Flame } from "lucide-react";
import { useWorkoutStore } from "@/store/workout-store";

export function StreakAndQuote() {
  const weeklyStreak = useWorkoutStore((state) => state.weeklyStreak);
  const quote = useWorkoutStore((state) => state.quoteOfTheRefresh);

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#4a1d1d] bg-[#1a0f0f] p-4">
        <p className="mb-1 text-xs uppercase tracking-[0.2em] text-[#f59e9e]">Current Streak</p>
        <p className="flex items-center gap-2 text-2xl font-bold text-[#ffe8b0]">
          {weeklyStreak} week streak <Flame className="h-5 w-5 text-[#f97316]" />
        </p>
      </div>
      <div className="rounded-2xl border border-[#2d2614] bg-[#16130d] p-4">
        <p className="mb-1 text-xs uppercase tracking-[0.2em] text-[#d4af37]">Motivation</p>
        <p className="text-sm text-[#ddd]">“{quote}”</p>
      </div>
    </section>
  );
}
