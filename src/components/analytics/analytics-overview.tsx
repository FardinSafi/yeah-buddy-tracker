"use client";

import { useEffect } from "react";
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

export function AnalyticsOverview() {
  const exercises = useWorkoutStore((state) => state.exercises);
  const weeklySeries = useWorkoutStore((state) => state.weeklySeries);
  const muscleGroups = useWorkoutStore((state) => state.muscleGroups);
  const muscleGroupHistory = useWorkoutStore((state) => state.muscleGroupHistory);
  const exerciseProgression = useWorkoutStore((state) => state.exerciseProgression);
  const selectedExerciseId = useWorkoutStore((state) => state.selectedExerciseId);
  const isAnalyticsLoading = useWorkoutStore((state) => state.isAnalyticsLoading);
  const refreshAnalytics = useWorkoutStore((state) => state.refreshAnalytics);
  const refreshExerciseProgression = useWorkoutStore((state) => state.refreshExerciseProgression);

  useEffect(() => {
    if (!selectedExerciseId && exercises.length > 0) {
      void refreshExerciseProgression(exercises[0].id);
    }
  }, [exercises, refreshExerciseProgression, selectedExerciseId]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#d4af37]">Analytics</p>
          <h1 className="text-2xl font-black text-[#f5e4b0]">Progress Trends</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => refreshAnalytics()}
          className="border-[#564827] bg-[#0e0e0e] text-[#f2dfa6]"
        >
          Refresh
        </Button>
      </div>

      <Card className="border border-[#3a3118] bg-[#12110d] text-[#efe0b2]">
        <CardHeader>
          <CardTitle>Total Weekly Tonnage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isAnalyticsLoading ? <p className="text-sm text-[#d4af37]">Refreshing analytics...</p> : null}
          {weeklySeries.length === 0 ? <p className="text-sm text-[#b8b8b8]">No analytics data yet.</p> : null}
          {weeklySeries.map((point) => (
            <div key={point.weekKey} className="flex items-center justify-between rounded-lg border border-[#2a2a2a] px-3 py-2">
              <span className="text-sm text-[#d4c18f]">{formatWeekLabel(point.weekKey)}</span>
              <span className="font-semibold text-[#f4e4b7]">{point.tonnageKg.toLocaleString()} kg</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-[#2f2a18] bg-[#12100b] text-[#efe0b2]">
        <CardHeader>
          <CardTitle>Muscle Group Weekly Trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {muscleGroups.map((group) => {
            const history = muscleGroupHistory[group.id] ?? [];
            const latest = history[history.length - 1];
            return (
              <div key={group.id} className="rounded-xl border border-[#252525] bg-[#0f0f0f] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-[#f3e2b2]">{group.name}</p>
                  <p className="text-xs text-[#c9b372]">
                    {latest ? `${latest.tonnageKg.toLocaleString()} / ${latest.targetKg.toLocaleString()} kg` : "No data"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-[#bbb] sm:grid-cols-6">
                  {history.map((point) => (
                    <div key={`${group.id}-${point.weekKey}`} className="rounded bg-[#191919] px-2 py-1 text-center">
                      <p>{point.weekKey.split("-W")[1]}</p>
                      <p className="font-semibold text-[#e7d39d]">{point.tonnageKg}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border border-[#2c2514] bg-[#120f09] text-[#efe0b2]">
        <CardHeader>
          <CardTitle>Exercise Progression</CardTitle>
          <div className="flex flex-wrap gap-2">
            {exercises.slice(0, 12).map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => refreshExerciseProgression(exercise.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  selectedExerciseId === exercise.id
                    ? "border-[#d4af37] bg-[#2c2411] text-[#f5e6bc]"
                    : "border-[#3a3a3a] bg-[#131313] text-[#bdbdbd] hover:border-[#7f6727]"
                }`}
              >
                {exercise.name}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {exerciseProgression.length === 0 ? (
            <p className="text-sm text-[#b8b8b8]">Select an exercise with logged sessions to view progression.</p>
          ) : (
            exerciseProgression.map((point) => (
              <div key={`${point.workoutId ?? point.dateIso}`} className="flex items-center justify-between rounded-lg border border-[#2a2a2a] px-3 py-2 text-sm">
                <span className="text-[#d0bf8b]">{new Date(point.dateIso).toLocaleDateString()}</span>
                <span className="text-[#f4e4b7]">{point.tonnageKg.toLocaleString()} kg</span>
                <span className="text-[#c6c6c6]">Top {point.topSetWeightKg} kg</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
