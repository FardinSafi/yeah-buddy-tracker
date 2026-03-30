"use client";

import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { useWorkoutBootstrap } from "@/hooks/use-workout-bootstrap";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { useWorkoutStore } from "@/store/workout-store";

export function AppProvider({ children }: { children: React.ReactNode }) {
  useWorkoutBootstrap();
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const setAuth = useAuthStore((state) => state.setAuth);

  const celebration = useWorkoutStore((state) => state.celebration);
  const closeCelebration = useWorkoutStore((state) => state.closeCelebration);

  useEffect(() => {
    void refreshSession();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession, setAuth]);

  useEffect(() => {
    if (!celebration.open) {
      return;
    }

    toast.success(`Yeah Buddy! ${celebration.muscleGroupName} target smashed.`, {
      description: celebration.quote,
      duration: 3500,
      style: {
        background: "#151515",
        color: "#f4e3b1",
        border: "1px solid #D4AF37",
      },
    });

    closeCelebration();
  }, [celebration, closeCelebration]);

  return (
    <>
      {children}
      <Toaster position="top-center" />
    </>
  );
}
