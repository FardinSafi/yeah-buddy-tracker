"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StreakAndQuote } from "@/components/dashboard/streak-and-quote";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";
import { DataControls } from "@/components/settings/data-controls";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useWorkoutStore } from "@/store/workout-store";

export default function Home() {
  const router = useRouter();
  const authInitialized = useAuthStore((state) => state.initialized);
  const authUser = useAuthStore((state) => state.user);
  const initialized = useWorkoutStore((state) => state.initialized);

  useEffect(() => {
    if (authInitialized && !authUser) {
      router.replace("/auth/login?next=/");
    }
  }, [authInitialized, authUser, router]);

  if (!authInitialized || (authInitialized && !authUser) || !initialized) {
    return (
      <main suppressHydrationWarning className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center p-6">
        <div suppressHydrationWarning className="flex items-center gap-2 text-[#d4af37]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-lg">Loading your plates...</span>
        </div>
      </main>
    );
  }

  return (
    <main suppressHydrationWarning className="mx-auto min-h-screen w-full max-w-xl space-y-5 bg-[radial-gradient(circle_at_top,_#1c1508_0%,_#0a0a0a_50%)] p-4 pb-10">
      <DashboardHeader />
      <StreakAndQuote />
      <WeeklyProgress />

      <div className="grid grid-cols-2 gap-3">
        <Link href="/history" className="block">
          <Button className="h-11 w-full rounded-2xl border border-[#4f4120] bg-[#1a1710] font-semibold text-[#ead9a4] hover:bg-[#241d0f]">
            History
          </Button>
        </Link>
        <Link href="/analytics" className="block">
          <Button className="h-11 w-full rounded-2xl border border-[#4f4120] bg-[#1a1710] font-semibold text-[#ead9a4] hover:bg-[#241d0f]">
            Analytics
          </Button>
        </Link>
      </div>

      <Link href="/workout-log" className="block">
        <Button className="h-14 w-full rounded-2xl bg-[#d4af37] text-lg font-bold text-[#141414] hover:bg-[#bf9b29]">
          Log Today&apos;s Workout
        </Button>
      </Link>

      <DataControls />
    </main>
  );
}
