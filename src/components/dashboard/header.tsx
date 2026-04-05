"use client";

import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useWorkoutStore } from "@/store/workout-store";

export function DashboardHeader() {
  const email = useAuthStore((state) => state.user?.email ?? null);
  const syncQueuedCount = useWorkoutStore((state) => state.syncQueuedCount);
  const syncFailedCount = useWorkoutStore((state) => state.syncFailedCount);

  const syncLabel =
    syncQueuedCount === 0 ? "Synced" : syncFailedCount > 0 ? `${syncQueuedCount} queued (retrying)` : `${syncQueuedCount} queued`;
  const syncBadgeClass =
    syncQueuedCount === 0
      ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
      : syncFailedCount > 0
        ? "border-amber-700/60 bg-amber-950/40 text-amber-300"
        : "border-[#4f4120] bg-[#1a1710] text-[#ead9a4]";

  return (
    <header className="flex items-center justify-between rounded-2xl border border-[#362c10] bg-gradient-to-r from-[#101010] to-[#17130a] p-4">
      <div>
        <p className="text-xs tracking-[0.28em] text-[#b91c1c] uppercase">Yeah Buddy</p>
        <h1 className="text-2xl font-black tracking-wide text-[#f6e6b3]">Light Weight</h1>
        {email ? <p className="mt-1 text-xs text-[#c7b274]">{email}</p> : null}
        <p className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${syncBadgeClass}`}>
          {syncLabel}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-xs font-semibold tracking-[0.12em] text-[#c7b274] uppercase hover:text-[#f6e6b3]">
          Settings
        </Link>
        <Link href="/auth/sign-out" className="text-xs font-semibold tracking-[0.12em] text-[#c7b274] uppercase hover:text-[#f6e6b3]">
          Sign Out
        </Link>
        <div className="rounded-full border border-[#d4af37] bg-[#120f07] p-3 text-[#d4af37]">
          <Dumbbell className="h-5 w-5" />
        </div>
      </div>
    </header>
  );
}
