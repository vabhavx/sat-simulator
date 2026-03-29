"use client";

import { useState } from "react";
import ExamTimer from "./ExamTimer";
import { motion, AnimatePresence } from "framer-motion";

interface ExamHeaderProps {
  sectionName: string;
  moduleLabel: string;
  sectionType: "rw" | "math";
  timeRemaining: number;
  onToggleCalculator?: () => void;
  onToggleReference?: () => void;
  timerHidden: boolean;
  onToggleTimer: () => void;
  calculatorOpen?: boolean;
  referenceOpen?: boolean;
}

export default function ExamHeader({
  sectionName,
  moduleLabel,
  sectionType,
  timeRemaining,
  onToggleCalculator,
  onToggleReference,
  timerHidden,
  onToggleTimer,
  calculatorOpen = false,
  referenceOpen = false,
}: ExamHeaderProps) {
  const [showDirections, setShowDirections] = useState(false);

  return (
    <>
      {/* ── Main Header Bar ── */}
      <header
        className="relative z-30 select-none text-white"
        role="banner"
      >
        {/* Gradient background layer */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[var(--surface-2)] to-[var(--surface)]" />

        {/* Subtle top highlight for glass depth */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Bottom edge line */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/20" />

        {/* Content */}
        <div className="relative flex items-center justify-between px-4 sm:px-6 py-2.5 md:py-3">

          {/* ── Left Zone: Section Info + Directions ── */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Section badge */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm sm:text-[15px] tracking-wide truncate">
                {sectionName}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/[0.08] border border-white/[0.06] px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-white/70 tracking-wide uppercase flex-shrink-0">
                {moduleLabel}
              </span>
            </div>

            {/* Separator */}
            <div className="hidden sm:block w-px h-5 bg-white/[0.12] flex-shrink-0" />

            {/* Directions toggle */}
            <button
              onClick={() => setShowDirections(!showDirections)}
              className={`
                flex items-center gap-1.5 text-sm rounded-md px-2.5 py-1.5
                transition-all duration-150
                ${showDirections
                  ? "bg-white/[0.15] text-white shadow-inner"
                  : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                }
              `}
              aria-label="Toggle directions"
              aria-expanded={showDirections}
            >
              {/* Info circle icon */}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span className="hidden sm:inline font-medium">Directions</span>
              {/* Chevron indicator */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`hidden sm:block transition-transform duration-200 ${
                  showDirections ? "rotate-180" : ""
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* ── Center Zone: Timer ── */}
          <div className="flex-shrink-0 mx-3 sm:mx-6">
            <div className="flex items-center justify-center px-3 sm:px-5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.06]">
              <ExamTimer
                timeRemainingMs={timeRemaining}
                hidden={timerHidden}
                onToggle={onToggleTimer}
              />
            </div>
          </div>

          {/* ── Right Zone: Tools ── */}
          <div
            className="flex items-center gap-0.5 flex-1 justify-end"
            role="toolbar"
            aria-label="Exam tools"
          >
            {sectionType === "math" && (
              <>
                {/* Calculator */}
                <button
                  onClick={onToggleCalculator}
                  className={`
                    group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm
                    transition-all duration-150
                    ${calculatorOpen
                      ? "bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                    }
                  `}
                  title="Calculator (Desmos)"
                  aria-label="Toggle calculator"
                  aria-pressed={calculatorOpen}
                >
                  {/* Calculator icon */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="8" y1="10" x2="8" y2="10.01" />
                    <line x1="12" y1="10" x2="12" y2="10.01" />
                    <line x1="16" y1="10" x2="16" y2="10.01" />
                    <line x1="8" y1="14" x2="8" y2="14.01" />
                    <line x1="12" y1="14" x2="12" y2="14.01" />
                    <line x1="16" y1="14" x2="16" y2="14.01" />
                    <line x1="8" y1="18" x2="8" y2="18.01" />
                    <line x1="12" y1="18" x2="16" y2="18" />
                  </svg>
                  <span className="hidden sm:inline font-medium">Calculator</span>
                </button>

                {/* Separator */}
                <div className="w-px h-5 bg-white/[0.1] mx-0.5 flex-shrink-0" />

                {/* Reference */}
                <button
                  onClick={onToggleReference}
                  className={`
                    group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm
                    transition-all duration-150
                    ${referenceOpen
                      ? "bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                    }
                  `}
                  title="Reference Sheet"
                  aria-label="Toggle reference sheet"
                  aria-pressed={referenceOpen}
                >
                  {/* Document icon */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span className="hidden sm:inline font-medium">Reference</span>
                </button>
              </>
            )}

            {sectionType === "rw" && (
              <button
                className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150"
                title="Annotation tools"
                aria-label="Annotation tools"
              >
                {/* Pen / edit icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span className="hidden sm:inline font-medium">Annotate</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Directions Panel ── */}
      <AnimatePresence>
        {showDirections && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const },
              opacity: { duration: 0.2, ease: "easeInOut" },
            }}
            className="overflow-hidden relative z-20"
          >
            {/* Panel background with subtle gradient */}
            <div className="bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface)] border-b border-[var(--border)]">
              <div className="max-w-2xl mx-auto px-6 py-5">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                    <p className="font-semibold text-sm text-[var(--text)] tracking-tight">
                      {sectionType === "rw"
                        ? "Reading & Writing Directions"
                        : "Math Directions"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDirections(false)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors p-1 rounded-md hover:bg-[var(--surface-3)]"
                    aria-label="Close directions"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Direction items */}
                {sectionType === "rw" ? (
                  <ul className="space-y-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      Read each passage and question carefully.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      Choose the best answer from the options provided.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      You may navigate freely within this module.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      Use the Mark for Review button to flag questions you want to revisit.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      Use the answer eliminator to cross out choices you&apos;ve ruled out.
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      Solve each problem and choose the best answer, or enter your response.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      A calculator is available for all questions in this section.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      A reference sheet with formulas is available from the toolbar.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      You may navigate freely within this module.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] mt-px select-none">&bull;</span>
                      For student-produced responses, enter your answer in the input field.
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
