"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

interface QuestionInfo {
  id: string;
  number: number;
}

interface ResponseInfo {
  answered: boolean;
  flagged: boolean;
}

interface QuestionNavigatorProps {
  questions: QuestionInfo[];
  currentIndex: number;
  responses: Map<string, ResponseInfo>;
  onGoTo: (index: number) => void;
  expanded: boolean;
  onToggle: () => void;
}

const springTransition = {
  type: "spring" as const,
  damping: 30,
  stiffness: 350,
  mass: 0.8,
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: { y: 0 },
};

export default function QuestionNavigator({
  questions,
  currentIndex,
  responses,
  onGoTo,
  expanded,
  onToggle,
}: QuestionNavigatorProps) {
  const { answeredCount, flaggedCount } = useMemo(() => {
    let answered = 0;
    let flagged = 0;
    for (const r of responses.values()) {
      if (r.answered) answered++;
      if (r.flagged) flagged++;
    }
    return { answeredCount: answered, flaggedCount: flagged };
  }, [responses]);

  const progressRatio = questions.length > 0 ? answeredCount / questions.length : 0;

  return (
    <>
      {/* ── Trigger Pill ── */}
      <button
        onClick={onToggle}
        className={`
          group relative flex items-center gap-1.5
          px-3.5 py-1.5 rounded-full text-sm font-semibold
          transition-all duration-250 ease-out
          select-none cursor-pointer
          ${
            expanded
              ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]"
              : "bg-[var(--surface-2)] text-white/90 hover:text-white hover:bg-[var(--accent)] hover:shadow-md hover:shadow-[var(--accent-glow)]"
          }
        `}
        aria-label="Toggle question navigator"
        aria-expanded={expanded}
      >
        <span className="tabular-nums tracking-tight">
          {currentIndex + 1}
        </span>
        <span className="text-white/40 font-normal">/</span>
        <span className="tabular-nums tracking-tight">
          {questions.length}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-0.5 opacity-60 transition-transform duration-300 ease-out ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* ── Bottom Sheet ── */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              key="backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
              onClick={onToggle}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={springTransition}
              className="
                fixed bottom-0 left-0 right-0 z-50
                bg-[var(--surface)] rounded-t-2xl
                shadow-[0_-8px_40px_rgba(0,0,0,0.3),0_-2px_12px_rgba(0,0,0,0.2)]
                max-h-[70vh] flex flex-col
              "
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-[3px] bg-[var(--text-tertiary)]/50 rounded-full" />
              </div>

              {/* Progress bar */}
              <div className="mx-5 mt-1 mb-2 h-1 bg-[var(--surface-3)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressRatio * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                />
              </div>

              {/* Header */}
              <div className="px-5 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text)] tracking-[-0.01em]">
                    Question Navigator
                  </h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 tabular-nums font-medium">
                    <span className="text-[var(--accent)] font-semibold">{answeredCount}</span>
                    {" "}of {questions.length} answered
                    {flaggedCount > 0 && (
                      <span className="ml-2 text-orange-600">
                        &middot; {flaggedCount} flagged
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={onToggle}
                  className="
                    w-8 h-8 flex items-center justify-center
                    rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)]
                    text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]
                    transition-colors duration-150
                  "
                  aria-label="Close navigator"
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

              {/* Scrollable grid */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                <div className="flex flex-wrap gap-2.5 justify-start">
                  {questions.map((q, idx) => {
                    const resp = responses.get(q.id);
                    const isCurrent = idx === currentIndex;
                    const isAnswered = resp?.answered ?? false;
                    const isFlagged = resp?.flagged ?? false;

                    return (
                      <motion.button
                        key={q.id}
                        onClick={() => {
                          onGoTo(idx);
                          onToggle();
                        }}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.2,
                          delay: Math.min(idx * 0.012, 0.4),
                          ease: "easeOut",
                        }}
                        whileTap={{ scale: 0.92 }}
                        className={`
                          relative w-11 h-11 text-sm font-semibold
                          rounded-xl flex items-center justify-center
                          transition-all duration-150 ease-out
                          cursor-pointer select-none
                          ${
                            isCurrent
                              ? "bg-[var(--surface)] text-[var(--accent)] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)] font-bold"
                              : isAnswered
                                ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm shadow-[var(--accent-glow)]"
                                : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                          }
                        `}
                        aria-label={`Question ${idx + 1}${isAnswered ? ", answered" : ", unanswered"}${isFlagged ? ", marked for review" : ""}${isCurrent ? ", current" : ""}`}
                        aria-current={isCurrent ? "true" : undefined}
                      >
                        {idx + 1}

                        {/* Flagged indicator - orange dot */}
                        {isFlagged && (
                          <span
                            className={`
                              absolute -top-0.5 -right-0.5
                              w-3 h-3 rounded-full
                              bg-orange-400
                              border-2 border-[var(--surface)]
                              shadow-sm
                            `}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Legend footer */}
              <div className="px-5 py-3.5 border-t border-[var(--border)] bg-[var(--surface-2)]">
                <div className="flex items-center justify-center gap-5 text-[11px] text-[var(--text-tertiary)] font-medium tracking-wide uppercase">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-[var(--accent)] shadow-sm" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)]" />
                    <span>Unanswered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-md ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface-2)] bg-[var(--surface)]" />
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative w-3.5 h-3.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full" />
                    </span>
                    <span>Flagged</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
