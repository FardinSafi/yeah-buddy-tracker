"use client";

import { motion } from "framer-motion";

type ProgressRingProps = {
  name: string;
  tonnageKg: number;
  targetKg: number;
  percent: number;
  accentColor: string;
};

const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({ name, tonnageKg, targetKg, percent, accentColor }: ProgressRingProps) {
  const strokeOffset = CIRCUMFERENCE - (Math.min(percent, 100) / 100) * CIRCUMFERENCE;

  return (
    <motion.div
      className="flex w-full flex-col items-center gap-2 rounded-2xl border border-[#2a2a2a] bg-[#111111] p-3"
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
    >
      <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${name} weekly progress`}>
        <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="#292929" strokeWidth="8" />
        <motion.circle
          cx="44"
          cy="44"
          r={RADIUS}
          fill="none"
          stroke={accentColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: strokeOffset }}
          initial={false}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="48" textAnchor="middle" fill="#f5f5f5" fontSize="16" fontWeight="700">
          {percent}%
        </text>
      </svg>
      <p className="text-xs font-semibold tracking-wide text-[#f3e5bc]">{name}</p>
      <p className="text-[11px] text-[#c2c2c2]">{tonnageKg.toLocaleString()} / {targetKg.toLocaleString()} kg</p>
    </motion.div>
  );
}
