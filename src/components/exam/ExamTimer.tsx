"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExamTimerProps {
  timeRemainingMs: number;
  hidden: boolean;
  onToggle: () => void;
}

// Ring geometry
const RING_SIZE = 46;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = 19;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_STROKE = 2.5;
const RING_BG_STROKE = 2;

function getTimerColor(timeRemainingMs: number) {
  if (timeRemainingMs <= 30_000 && timeRemainingMs > 0) return "#f87171"; // red-400
  if (timeRemainingMs <= 60_000 && timeRemainingMs > 0) return "#ef4444"; // red-500
  if (timeRemainingMs <= 5 * 60_000 && timeRemainingMs > 0) return "#fbbf24"; // amber-400
  return "#ffffff"; // white
}

export default function ExamTimer({
  timeRemainingMs,
  hidden,
  onToggle,
}: ExamTimerProps) {
  const [lockedVisible, setLockedVisible] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const warningShownRef = useRef(false);
  const totalMsRef = useRef<number>(0);

  // Capture the initial total time from the first meaningful value
  useEffect(() => {
    if (timeRemainingMs > 0 && totalMsRef.current === 0) {
      totalMsRef.current = timeRemainingMs;
    }
  }, [timeRemainingMs]);

  const totalMs = totalMsRef.current || timeRemainingMs || 1;
  const progress = Math.max(0, Math.min(1, timeRemainingMs / totalMs));
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  const totalSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isUnderFive = timeRemainingMs <= 5 * 60_000 && timeRemainingMs > 0;
  const isUnderThirty = timeRemainingMs <= 30_000 && timeRemainingMs > 0;

  const timerColor = getTimerColor(timeRemainingMs);

  // Bluebook behavior: at 5 minutes, show warning banner + lock timer visible
  useEffect(() => {
    if (isUnderFive && !warningShownRef.current) {
      warningShownRef.current = true;
      setLockedVisible(true);
      setShowWarningBanner(true);
      const timeout = setTimeout(() => setShowWarningBanner(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [isUnderFive]);

  const isVisible = lockedVisible || !hidden;
  const canHide = !lockedVisible;

  // Hidden state: compact show button
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-white/60 hover:text-white/90 text-sm transition-colors duration-200"
        aria-label="Show timer"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="font-medium">Show</span>
      </button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2.5">
        {/* Circular progress ring with time display */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: RING_SIZE, height: RING_SIZE }}
        >
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="absolute inset-0"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Background track */}
            <circle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={RING_BG_STROKE}
            />
            {/* Progress arc */}
            <circle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              fill="none"
              stroke={timerColor}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 1s linear, stroke 0.6s ease",
                opacity: 0.85,
              }}
            />
          </svg>

          {/* Time text centered inside the ring */}
          <span
            className="relative font-mono text-[11px] font-semibold tabular-nums leading-none tracking-tight select-none"
            style={{
              color: timerColor,
              transition: "color 0.6s ease",
              ...(isUnderThirty
                ? { animation: "timer-critical-pulse 0.6s ease-in-out infinite" }
                : {}),
            }}
            role="timer"
            aria-live="polite"
            aria-label={`${minutes} minutes and ${seconds} seconds remaining`}
          >
            {display}
          </span>
        </div>

        {/* Hide button */}
        {canHide && (
          <button
            onClick={onToggle}
            className="text-white/40 hover:text-white/80 text-[11px] font-medium tracking-wide uppercase transition-colors duration-200 px-1.5 py-0.5 rounded border border-white/10 hover:border-white/25"
            aria-label="Hide timer"
          >
            Hide
          </button>
        )}
      </div>

      {/* 5-minute warning banner */}
      <AnimatePresence>
        {showWarningBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black/10 px-6 py-4 max-w-sm w-[90vw]"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text)]">
                  5 Minutes Remaining
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  The timer will remain visible for the rest of this module.
                </p>
              </div>
              <button
                onClick={() => setShowWarningBanner(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors p-1 -mt-1 -mr-1"
                aria-label="Dismiss warning"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
