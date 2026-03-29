"use client";

import type { AnswerOption } from "@/types/exam";
import { motion, AnimatePresence } from "framer-motion";

interface AnswerChoicesProps {
  options: AnswerOption[];
  selectedAnswer: string | null;
  crossedOut: Set<string>;
  onSelect: (letter: string) => void;
  onToggleCrossOut: (letter: string) => void;
  showCrossOutButtons?: boolean;
}

const optionVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

export default function AnswerChoices({
  options,
  selectedAnswer,
  crossedOut,
  onSelect,
  onToggleCrossOut,
  showCrossOutButtons = false,
}: AnswerChoicesProps) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Answer choices">
      {options.map((opt, i) => {
        const isSelected = selectedAnswer === opt.letter;
        const isCrossed = crossedOut.has(opt.letter);

        return (
          <motion.div
            key={opt.letter}
            className="group relative flex items-start"
            custom={i}
            variants={optionVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Cross-out button */}
            <AnimatePresence>
              {showCrossOutButtons && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 24, marginRight: 8 }}
                  exit={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCrossOut(opt.letter);
                  }}
                  title={isCrossed ? "Undo cross out" : "Cross out"}
                  aria-label={`${isCrossed ? "Undo cross out" : "Cross out"} option ${opt.letter}`}
                  className={`flex-shrink-0 h-6 mt-3.5 flex items-center justify-center rounded-md transition-all duration-200 ${
                    isCrossed
                      ? "bg-[var(--text)] text-[var(--bg)] shadow-sm"
                      : "bg-[var(--surface-3)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {isCrossed ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M9 14L4 9m0 0l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H13" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Main option button */}
            <motion.button
              onClick={() => {
                if (isCrossed) onToggleCrossOut(opt.letter);
                onSelect(opt.letter);
              }}
              className={`flex-1 text-left rounded-xl border-2 transition-all duration-250 flex items-start gap-3 overflow-hidden ${
                isCrossed
                  ? "opacity-35 border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
                  : isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]/[0.06] shadow-[0_0_0_1px_var(--accent-glow),0_2px_8px_var(--accent-glow)] px-4 py-3"
                    : "border-[var(--border)] hover:border-[var(--text-tertiary)] px-4 py-3"
              }`}
              whileTap={{ scale: 0.995 }}
              layout
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${opt.letter}: ${opt.text}`}
            >
              {/* Letter circle */}
              <motion.span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 transition-all duration-250 ${
                  isSelected
                    ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent-glow)]"
                    : "border-2 border-[var(--text-tertiary)] text-[var(--text-tertiary)]"
                }`}
                animate={
                  isSelected
                    ? { scale: [1, 1.12, 1], transition: { duration: 0.3, ease: "easeOut" } }
                    : { scale: 1 }
                }
              >
                {isSelected ? (
                  <motion.svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </motion.svg>
                ) : (
                  opt.letter
                )}
              </motion.span>

              {/* Option text */}
              <span
                className={`text-[15px] leading-relaxed whitespace-pre-wrap transition-colors duration-200 ${
                  isCrossed
                    ? "line-through text-[var(--text-tertiary)] decoration-[var(--text-tertiary)]/60"
                    : isSelected
                      ? "text-[var(--text)]"
                      : "text-[var(--text-secondary)]"
                }`}
              >
                {opt.text}
              </span>
            </motion.button>
          </motion.div>
        );
      })}
    </div>
  );
}
