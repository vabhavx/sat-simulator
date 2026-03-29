"use client";

import { motion } from "framer-motion";

interface BreakScreenProps {
  timeRemainingMs: number;
  completedSection: string;
  nextSection: string;
  onResume: () => void;
}

export default function BreakScreen({
  timeRemainingMs,
  completedSection,
  nextSection,
  onResume,
}: BreakScreenProps) {
  const totalSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Progress ring (10 min = 600s total)
  const totalBreak = 600;
  const progress = Math.min(1, totalSeconds / totalBreak);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
      <motion.div
        className="text-center max-w-md px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Timer ring */}
        <motion.div
          className="relative w-32 h-32 mx-auto mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
        >
          <svg width="128" height="128" viewBox="0 0 128 128" className="transform -rotate-90">
            {/* Background ring */}
            <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="3" />
            {/* Progress ring */}
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold text-[var(--accent)] tabular-nums">{display}</span>
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">remaining</span>
          </div>
        </motion.div>

        <motion.h1
          className="text-xl font-bold text-[var(--text)] mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Take a Break
        </motion.h1>
        <motion.p
          className="text-sm text-[var(--text-secondary)] mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Rest your eyes before the next section.
        </motion.p>

        {/* Section progress */}
        <motion.div
          className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 mb-8 text-left space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-[var(--text)]">{completedSection}</span>
              <span className="text-xs text-emerald-600 ml-2">Completed</span>
            </div>
          </div>
          <div className="w-full h-px bg-[var(--border)]" />
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[var(--accent)]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-[var(--text)]">{nextSection}</span>
              <span className="text-xs text-[var(--text-tertiary)] ml-2">Up next</span>
            </div>
          </div>
        </motion.div>

        {/* Resume button */}
        <motion.button
          onClick={onResume}
          className="w-full bg-[var(--accent)] text-white py-3.5 rounded-xl font-semibold text-base hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-lg shadow-[var(--accent-glow)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.99 }}
        >
          Resume Testing
        </motion.button>

        <motion.p
          className="text-[11px] text-[var(--text-tertiary)] mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          The break timer will auto-resume when it reaches zero.
        </motion.p>
      </motion.div>
    </div>
  );
}
