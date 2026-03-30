"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useWorkoutStore } from "@/store/workout-store";

export function useWorkoutBootstrap(): void {
  const pathname = usePathname();
  const authInitialized = useAuthStore((state) => state.initialized);
  const authUser = useAuthStore((state) => state.user);
  const initialized = useWorkoutStore((state) => state.initialized);
  const bootstrap = useWorkoutStore((state) => state.bootstrap);
  const syncPendingChanges = useWorkoutStore((state) => state.syncPendingChanges);
  const isAuthRoute = pathname.startsWith("/auth");

  useEffect(() => {
    if (!authInitialized || !authUser || initialized || isAuthRoute) {
      return;
    }

    void bootstrap().catch((error) => {
      console.error("Workout bootstrap failed:", error);
    });
  }, [authInitialized, authUser, bootstrap, initialized, isAuthRoute]);

  useEffect(() => {
    if (!authInitialized || !authUser || isAuthRoute) {
      return;
    }

    const onOnline = () => {
      void syncPendingChanges();
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [authInitialized, authUser, isAuthRoute, syncPendingChanges]);
}
