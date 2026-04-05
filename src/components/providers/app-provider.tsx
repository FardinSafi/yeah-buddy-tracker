"use client";

import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { useWorkoutBootstrap } from "@/hooks/use-workout-bootstrap";
import { playYeahBuddySound, primeYeahBuddySound } from "@/lib/utils/audio";
import { useAuthStore } from "@/store/auth-store";
import { useWorkoutStore } from "@/store/workout-store";

export function AppProvider({ children }: { children: React.ReactNode }) {
  useWorkoutBootstrap();
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const setAuth = useAuthStore((state) => state.setAuth);

  const celebration = useWorkoutStore((state) => state.celebration);
  const closeCelebration = useWorkoutStore((state) => state.closeCelebration);
  const isMuted = useWorkoutStore((state) => state.isMuted);

  // Prime the audio buffer on mount, then play on the first user gesture.
  useEffect(() => {
    primeYeahBuddySound();
  }, []);

  useEffect(() => {
    if (isMuted) {
      return;
    }

    let hasPlayed = false;

    const playOnce = () => {
      if (hasPlayed) {
        return;
      }

      hasPlayed = true;
      playYeahBuddySound(false);
    };

    window.addEventListener("pointerdown", playOnce, { once: true, passive: true });
    window.addEventListener("keydown", playOnce, { once: true });

    return () => {
      window.removeEventListener("pointerdown", playOnce);
      window.removeEventListener("keydown", playOnce);
    };
  }, [isMuted]);

  // Initialize auth session
  useEffect(() => {
    void refreshSession();
  }, [refreshSession, setAuth]);

  // Handle celebration toasts
  useEffect(() => {
    if (!celebration) {
      return;
    }

    if (celebration.kind === "exercise-pr") {
      toast.success(`New PR! ${celebration.exerciseName} at ${celebration.newTopSetKg} kg`, {
        description: `Previous best: ${celebration.previousTopSetKg} kg`,
        duration: 3500,
        style: {
          background: "#151515",
          color: "#f4e3b1",
          border: "1px solid #D4AF37",
        },
      });
    } else {
      toast.success(`Yeah Buddy! ${celebration.muscleGroupName} target smashed.`, {
        description: celebration.quote,
        duration: 3500,
        style: {
          background: "#151515",
          color: "#f4e3b1",
          border: "1px solid #D4AF37",
        },
      });
    }

    const timer = window.setTimeout(() => {
      closeCelebration();
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [celebration, closeCelebration]);

  return (
    <>
      {children}
      <Toaster position="top-center" />
    </>
  );
}
