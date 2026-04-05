"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useWorkoutStore } from "@/store/workout-store";

export default function SettingsPage() {
  const isAuthenticated = useAuthStore((state) => state.user !== null);

  const isMuted = useWorkoutStore((state) => state.isMuted);
  const setMuted = useWorkoutStore((state) => state.setMuted);
  const exportJson = useWorkoutStore((state) => state.exportJson);
  const importJsonFile = useWorkoutStore((state) => state.importJsonFile);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Navigation will be handled by middleware or auth check
    }
  }, [isAuthenticated]);

  async function handleToggleMute() {
    try {
      await setMuted(!isMuted);
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportJson();
    } finally {
      setIsExporting(false);
    }
  }

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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center text-sm text-[#b4b4b4] hover:text-[#d4af37] transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-[#f5f5f5] font-heading tracking-wider">Settings</h1>
          <p className="mt-2 text-[#b4b4b4]">Personalize your Yeah Buddy experience</p>
        </div>

        {/* Audio Settings */}
        <Card className="mb-8 border-[#2a2a2a] bg-[#111111] p-6">
          <h2 className="text-xl font-bold text-[#f5f5f5] font-heading tracking-wide mb-4">Sound</h2>
          <p className="text-sm text-[#b4b4b4] mb-6">Control application audio feedback</p>

          <Button
            type="button"
            variant="outline"
            onClick={handleToggleMute}
            className="w-full h-12 border-[#3d3d3d] bg-[#0f0f0f] text-[#ddd] hover:bg-[#1a1a1a] font-semibold"
          >
            {isMuted ? "🔇 Unmute Audio" : "🔊 Mute Audio"}
          </Button>
          <p className="mt-3 text-xs text-[#909090]">
            {isMuted
              ? "Audio notifications are currently muted."
              : "You'll hear audio feedback when you hit muscle group targets."}
          </p>
        </Card>

        {/* Data Management */}
        <Card className="border-[#2a2a2a] bg-[#111111] p-6">
          <h2 className="text-xl font-bold text-[#f5f5f5] font-heading tracking-wide mb-4">Data Management</h2>
          <p className="text-sm text-[#b4b4b4] mb-6">Export or import your workout data</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="h-12 border-[#3d3d3d] bg-[#0f0f0f] text-[#ddd] hover:bg-[#1a1a1a] font-semibold disabled:opacity-50"
            >
              {isExporting ? "Exporting..." : "📥 Export JSON"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="h-12 border-[#3d3d3d] bg-[#0f0f0f] text-[#ddd] hover:bg-[#1a1a1a] font-semibold disabled:opacity-50"
            >
              {isImporting ? "Importing..." : "📤 Import JSON"}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
          />

          <p className="mt-4 text-xs text-[#909090]">
            Export your data to create a backup or transfer to another device. Import from a previously exported file.
          </p>
        </Card>

        {/* Footer */}
        <div className="mt-12 border-t border-[#2a2a2a] pt-8">
          <p className="text-center text-xs text-[#707070]">
            Yeah Buddy Tracker • Made with 💪 for bodybuilders everywhere
          </p>
        </div>
      </div>
    </div>
  );
}
