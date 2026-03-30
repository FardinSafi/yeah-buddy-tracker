"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkoutStore } from "@/store/workout-store";

export function DataControls() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const isMuted = useWorkoutStore((state) => state.isMuted);
  const setMuted = useWorkoutStore((state) => state.setMuted);
  const exportJson = useWorkoutStore((state) => state.exportJson);
  const importJsonFile = useWorkoutStore((state) => state.importJsonFile);

  async function handleImportFile(file: File | null) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      await importJsonFile(file);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[#b8b8b8]">Settings & Data</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => void setMuted(!isMuted)}
          className="h-11 border-[#3d3d3d] bg-[#0f0f0f] text-[#ddd]"
        >
          {isMuted ? "Unmute Audio" : "Mute Audio"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void exportJson()}
          className="h-11 border-[#3d3d3d] bg-[#0f0f0f] text-[#ddd]"
        >
          Export JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="h-11 border-[#3d3d3d] bg-[#0f0f0f] text-[#ddd]"
        >
          {isImporting ? "Importing..." : "Import JSON"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
      />
    </section>
  );
}
