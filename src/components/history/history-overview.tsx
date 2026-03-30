"use client";

import { useMemo } from "react";
import { useWorkoutStore } from "@/store/workout-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatWeekLabel(weekKey: string): string {
  const [yearPart, weekPart] = weekKey.split("-W");
  const weekNumber = Number(weekPart);
  if (!Number.isFinite(weekNumber)) {
    return weekKey;
  }
  return `${yearPart} Week ${weekNumber}`;
}

function formatDayLabel(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function HistoryOverview() {
  const historyWeeks = useWorkoutStore((state) => state.historyWeeks);
  const selectedHistoryWeekKey = useWorkoutStore((state) => state.selectedHistoryWeekKey);
  const isHistoryLoading = useWorkoutStore((state) => state.isHistoryLoading);
  const selectHistoryWeek = useWorkoutStore((state) => state.selectHistoryWeek);
  const refreshHistory = useWorkoutStore((state) => state.refreshHistory);

  const selectedWeek = useMemo(
    () => historyWeeks.find((week) => week.weekKey === selectedHistoryWeekKey) ?? historyWeeks[0],
    [historyWeeks, selectedHistoryWeekKey],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Workout History</p>
          <h1 className="text-2xl font-black text-[#f5e4b0]">Recent Weeks</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => refreshHistory()}
          className="border-[#564827] bg-[#0e0e0e] text-[#f2dfa6]"
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {historyWeeks.map((week) => (
          <button
            key={week.weekKey}
            type="button"
            onClick={() => selectHistoryWeek(week.weekKey)}
            className={`rounded-xl border px-3 py-2 text-left transition ${
              week.weekKey === selectedWeek?.weekKey
                ? "border-[#d4af37] bg-[#2a220f] text-[#f8e9b8]"
                : "border-[#343434] bg-[#101010] text-[#c5c5c5] hover:border-[#816929]"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider">{formatWeekLabel(week.weekKey)}</p>
            <p className="mt-1 text-xs opacity-80">{week.workoutCount} workouts</p>
          </button>
        ))}
      </div>

      {isHistoryLoading ? <p className="text-sm text-[#d4af37]">Loading history...</p> : null}

      {!isHistoryLoading && selectedWeek ? (
        <Card className="border border-[#3a3118] bg-[#12110d] text-[#efe0b2]">
          <CardHeader>
            <CardTitle>{formatWeekLabel(selectedWeek.weekKey)}</CardTitle>
            <p className="text-sm text-[#bea867]">{selectedWeek.totalTonnageKg.toLocaleString()} kg total tonnage</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedWeek.days.length === 0 ? (
              <p className="text-sm text-[#b8b8b8]">No workouts logged this week yet.</p>
            ) : (
              selectedWeek.days.map((day) => (
                <div key={day.dayKey} className="rounded-xl border border-[#2c2c2c] bg-[#0f0f0f] p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-[#c9b372]">
                    <span>{formatDayLabel(day.dayKey)}</span>
                    <span>{day.totalTonnageKg.toLocaleString()} kg</span>
                  </div>

                  <div className="space-y-2">
                    {day.workouts.map((workout) => (
                      <div key={`${workout.id ?? workout.dateIso}-${workout.exerciseId}`} className="rounded-lg border border-[#242424] p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[#f4e4b7]">{workout.exerciseName}</p>
                          <p className="text-xs text-[#bdbdbd]">{workout.muscleGroupName}</p>
                        </div>
                        <p className="text-xs text-[#d8c78e]">{workout.setCount} sets • {workout.tonnageKg.toLocaleString()} kg</p>
                        {workout.notes ? <p className="mt-1 text-xs text-[#a8a8a8]">{workout.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
