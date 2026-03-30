"use client";

import { useEffect } from "react";
import { useWorkoutStore } from "@/store/workout-store";

export function useWorkoutBootstrap(): void {
  const initialized = useWorkoutStore((state) => state.initialized);
  const bootstrap = useWorkoutStore((state) => state.bootstrap);

  useEffect(() => {
    if (!initialized) {
      void bootstrap();
    }
  }, [bootstrap, initialized]);
}
