"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { Button } from "@/components/ui/button";
import { useWorkoutStore } from "@/store/workout-store";

export default function AnalyticsPage() {
  const initialized = useWorkoutStore((state) => state.initialized);

  if (!initialized) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center p-6">
        <div className="flex items-center gap-2 text-[#d4af37]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-lg">Loading analytics...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl space-y-4 bg-[radial-gradient(circle_at_top,_#1c1508_0%,_#0a0a0a_55%)] p-4 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#f5e4b0]">Analytics</h1>
        <Link href="/">
          <Button variant="outline" className="border-[#3a3a3a] bg-[#101010] text-[#ddd]">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <AnalyticsOverview />
    </main>
  );
}
