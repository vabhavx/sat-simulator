"use client";

import { motion } from "framer-motion";

interface SubmitConfirmModalProps {
  moduleName: string;
  unanswered: number;
  marked: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
};

export default function SubmitConfirmModal({
  moduleName,
  unanswered,
  marked,
  onCancel,
  onConfirm,
}: SubmitConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Submit module confirmation"
    >
      {/* Overlay */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={onCancel}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.2 }}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-[var(--surface)] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4),0_0_0_1px_var(--border)] max-w-md w-full mx-4 overflow-hidden"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-hover)] to-[var(--accent)]" />

        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/[0.1] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <rect x="3" y="3" width="18" height="18" rx="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Submit Module?</h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{moduleName}</p>
            </div>
          </div>
        </div>

        {/* Warnings */}
        <div className="px-6 pb-4 space-y-2">
          {unanswered > 0 && (
            <motion.div
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <span className="text-sm text-amber-600 font-medium">
                {unanswered} question{unanswered !== 1 ? "s" : ""} unanswered
              </span>
            </motion.div>
          )}

          {marked > 0 && (
            <motion.div
              className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span className="text-sm text-orange-600 font-medium">
                {marked} question{marked !== 1 ? "s" : ""} marked for review
              </span>
            </motion.div>
          )}
        </div>

        {/* Warning text */}
        <div className="px-6 pb-5">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            You will <strong className="text-[var(--text)]">not</strong> be able to return to this module after submitting.
          </p>
        </div>

        {/* Actions */}
        <div className="flex border-t border-[var(--border)]">
          <motion.button
            onClick={onCancel}
            className="flex-1 px-6 py-3.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-200 border-r border-[var(--border)]"
            whileTap={{ scale: 0.97 }}
          >
            Go Back
          </motion.button>
          <motion.button
            onClick={onConfirm}
            className="flex-1 px-6 py-3.5 text-sm font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all duration-200"
            whileHover={{ backgroundColor: "var(--accent-hover)" }}
            whileTap={{ scale: 0.97 }}
          >
            Submit
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
