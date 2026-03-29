"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface QuestionStatus {
  number: number;
  answered: boolean;
  flagged: boolean;
}

interface ModuleReviewScreenProps {
  moduleName: string;
  questions: QuestionStatus[];
  onGoToQuestion: (index: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 25 },
  },
};

export default function ModuleReviewScreen({
  moduleName,
  questions,
  onGoToQuestion,
  onSubmit,
  onCancel,
}: ModuleReviewScreenProps) {
  const { answered, unanswered, flagged } = useMemo(() => ({
    answered: questions.filter((q) => q.answered).length,
    unanswered: questions.filter((q) => !q.answered).length,
    flagged: questions.filter((q) => q.flagged).length,
  }), [questions]);

  const progressPercent = questions.length > 0 ? (answered / questions.length) * 100 : 0;

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-[var(--bg)] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="relative text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[var(--surface-2)] to-[var(--surface)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/20" />
        <div className="relative px-6 py-5">
          <motion.h1
            className="text-lg font-bold tracking-tight"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Check Your Work
          </motion.h1>
          <motion.p
            className="text-sm text-white/60 mt-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {moduleName}
          </motion.p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-8">

          {/* Progress bar */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
              <span className="font-medium">Completion</span>
              <span className="tabular-nums font-semibold text-[var(--accent)]">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
              />
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: answered, label: "Answered", color: "text-[var(--accent)]", bg: "bg-[var(--accent)]/[0.06] border-[var(--accent)]/[0.12]" },
              { value: unanswered, label: "Unanswered", color: unanswered > 0 ? "text-amber-600" : "text-[var(--text-tertiary)]", bg: unanswered > 0 ? "bg-amber-50 border-amber-200" : "bg-[var(--surface-2)] border-[var(--border)]" },
              { value: flagged, label: "For Review", color: flagged > 0 ? "text-orange-600" : "text-[var(--text-tertiary)]", bg: flagged > 0 ? "bg-orange-50 border-orange-200" : "bg-[var(--surface-2)] border-[var(--border)]" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className={`border rounded-xl p-4 text-center ${stat.bg}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease: "easeOut" }}
              >
                <motion.p
                  className={`text-2xl font-bold tabular-nums ${stat.color}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-semibold uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Question Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
              Click any question to return to it.
            </p>
            <motion.div
              className="flex flex-wrap gap-2.5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {questions.map((q, idx) => (
                <motion.button
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ scale: 1.08, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onGoToQuestion(idx)}
                  className={`relative w-11 h-11 text-sm font-semibold rounded-xl flex items-center justify-center transition-colors duration-150 cursor-pointer select-none ${
                    q.answered
                      ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent-glow)] hover:bg-[var(--accent-hover)]"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-2 border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  }`}
                  aria-label={`Question ${q.number}${q.answered ? ", answered" : ", unanswered"}${q.flagged ? ", marked for review" : ""}`}
                >
                  {q.number}
                  {q.flagged && (
                    <motion.span
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-400 rounded-full border-2 border-[var(--bg)]"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-5 text-[11px] text-[var(--text-tertiary)] font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-[var(--accent)] shadow-sm" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md border-2 border-[var(--border)] bg-[var(--surface-2)]" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative w-3.5 h-3.5 rounded-md border-2 border-[var(--border)] bg-[var(--surface-2)]">
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full" />
                </span>
                <span>For Review</span>
              </div>
            </div>
          </motion.div>

          {/* Warning */}
          <motion.div
            className="mt-8 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <p className="text-sm text-amber-600 leading-relaxed">
                Once you submit, you <strong>cannot return</strong> to this module.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Actions */}
      <motion.div
        className="border-t border-[var(--border)] bg-[var(--surface)] px-5 sm:px-6 py-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <motion.button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-2)] hover:border-[var(--text-tertiary)] transition-all duration-200"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            &larr; Back to Questions
          </motion.button>
          <motion.button
            onClick={onSubmit}
            className="px-8 py-2.5 text-sm font-bold text-white bg-[var(--accent)] rounded-xl hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-lg shadow-[var(--accent-glow)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Submit Module &rarr;
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
