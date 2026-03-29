"use client";

import { motion } from "framer-motion";

interface MarkForReviewProps {
  marked: boolean;
  onToggle: () => void;
}

export default function MarkForReview({ marked, onToggle }: MarkForReviewProps) {
  return (
    <motion.button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-250 ${
        marked
          ? "bg-orange-50 text-orange-600 border border-orange-200 shadow-sm shadow-orange-200/30"
          : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text)]"
      }`}
      whileTap={{ scale: 0.95 }}
      aria-label={marked ? "Unmark for review" : "Mark for review"}
      aria-pressed={marked}
    >
      <motion.svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={marked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={marked ? { scale: [1, 1.3, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </motion.svg>
      <span>{marked ? "Marked" : "Mark for Review"}</span>
    </motion.button>
  );
}
