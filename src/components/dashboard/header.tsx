import { Dumbbell } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between rounded-2xl border border-[#362c10] bg-gradient-to-r from-[#101010] to-[#17130a] p-4">
      <div>
        <p className="text-xs tracking-[0.28em] text-[#b91c1c] uppercase">Yeah Buddy Tracker</p>
        <h1 className="text-2xl font-black tracking-wide text-[#f6e6b3]">Yeah Buddy</h1>
      </div>
      <div className="rounded-full border border-[#d4af37] bg-[#120f07] p-3 text-[#d4af37]">
        <Dumbbell className="h-5 w-5" />
      </div>
    </header>
  );
}
