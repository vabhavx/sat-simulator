"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

/* ───────────────────────────────────────────────────────────
   Taxonomy — precise classification, zero ambiguity
   ─────────────────────────────────────────────────────────── */

interface PdfEntry {
  title: string;
  fileName: string;
  tag: string;
  tagColor: string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  accent: string;
  accentBg: string;
  count: number;
  items: PdfEntry[];
}

const CATEGORIES: Category[] = [
  {
    id: "complete-prep",
    label: "Complete Prep Books",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    accent: "#7c3aed",
    accentBg: "#7c3aed25",
    count: 2,
    items: [
      { title: "Princeton Review 2025 Premium", fileName: "The Princeton Review 2025 PREMIUM @DSATuz.pdf", tag: "ALL SECTIONS", tagColor: "#7c3aed" },
      { title: "Barron's Digital SAT", fileName: "Barrons Digital SAT preview.pdf", tag: "ALL SECTIONS", tagColor: "#7c3aed" },
    ],
  },
  {
    id: "math-books",
    label: "Math Prep",
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    accent: "#2563eb",
    accentBg: "#2563eb25",
    count: 2,
    items: [
      { title: "Acing the New SAT Math", fileName: "Acing the New - SAT Math.pdf", tag: "FULL BOOK", tagColor: "#2563eb" },
      { title: "College Panda Math", fileName: "CollegePandaMath @DSATuz.pdf", tag: "DRILL-HEAVY", tagColor: "#0891b2" },
    ],
  },
  {
    id: "english-books",
    label: "English & Reading Prep",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    accent: "#059669",
    accentBg: "#05966925",
    count: 3,
    items: [
      { title: "College Panda Writing", fileName: "CollegePanda_for_DSAT @DSATuz.pdf", tag: "WRITING", tagColor: "#059669" },
      { title: "Digital SAT English Workbook", fileName: "Digital SAT English Workbook@DSATuz.pdf", tag: "PRACTICE", tagColor: "#0891b2" },
      { title: "Erica Meltzer Reading", fileName: "Erica Reading @DSATuz.pdf", tag: "READING", tagColor: "#7c3aed" },
    ],
  },
  {
    id: "grammar",
    label: "Grammar Rules",
    icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z",
    accent: "#d97706",
    accentBg: "#d9770625",
    count: 5,
    items: [
      { title: "Erica Meltzer Grammar Rules", fileName: "[Erica Meltzer] Grammar Rules.pdf", tag: "ESSENTIAL", tagColor: "#dc2626" },
      { title: "ERICA Grammar Guide", fileName: "ERICA Grammar @DSATuz.pdf", tag: "CONDENSED", tagColor: "#d97706" },
      { title: "Top 50 SAT Grammar Rules", fileName: "Top 50 SAT Grammar Rules @DSATuz.pdf", tag: "TOP 50", tagColor: "#2563eb" },
      { title: "SAT & ACT All Grammar Rules", fileName: "SAT & ACT all grammar rules @DSATuz.pdf", tag: "COMPLETE", tagColor: "#059669" },
      { title: "Transitions Guide", fileName: "transitions @DSATuz.pdf", tag: "HIGH-FREQ", tagColor: "#7c3aed" },
    ],
  },
  {
    id: "vocabulary",
    label: "Vocabulary",
    icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12",
    accent: "#0891b2",
    accentBg: "#0891b225",
    count: 4,
    items: [
      { title: "Erica Meltzer — Vocabulary: A New Approach", fileName: "Erica's vocabulary A new approach@DSATuz.pdf", tag: "STRATEGY", tagColor: "#7c3aed" },
      { title: "Must-Know 650 SAT Real Exam Words", fileName: "MUST KNOW 650 SAT real exam words @DSATuz.pdf", tag: "650 WORDS", tagColor: "#dc2626" },
      { title: "Top 1000 SAT Vocabulary", fileName: "THE MOST USED 1000 SATvocabulary@DSATuz.pdf", tag: "1000 WORDS", tagColor: "#2563eb" },
      { title: "SAT Verbal Vocabulary Test Prep", fileName: "TestVerbalVocabulary@DSATuz.pdf", tag: "PRACTICE", tagColor: "#059669" },
    ],
  },
  {
    id: "formulas",
    label: "Formulas & Cheat Sheets",
    icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    accent: "#dc2626",
    accentBg: "#dc262625",
    count: 3,
    items: [
      { title: "SAT Formula Sheet", fileName: "Formula sheet for SAT by @DSATuz.pdf", tag: "1-PAGER", tagColor: "#dc2626" },
      { title: "Facts & Formulas Reference", fileName: "facts-and-formulas-0_230518_202506.pdf", tag: "DETAILED", tagColor: "#d97706" },
      { title: "Desmos — Hardest Questions Solved", fileName: "Desmos solutions for hardest questions @DSATuz.pdf", tag: "DESMOS", tagColor: "#2563eb" },
    ],
  },
  {
    id: "last-minute",
    label: "Last-Minute Cram",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    accent: "#e11d48",
    accentBg: "#e11d4825",
    count: 1,
    items: [
      { title: "Last Minute SAT Rules", fileName: "LAST MINUTE SAT RULES @DSATuz.pdf", tag: "EXAM EVE", tagColor: "#e11d48" },
    ],
  },
];

const TOTAL_FILES = CATEGORIES.reduce((s, c) => s + c.items.length, 0);

export default function PremiumMaterialPage() {
  const { user, signOut } = useAuth();
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  function handleDownload(fileName: string) {
    const link = document.createElement("a");
    link.href = `/pdfs/premium/${encodeURIComponent(fileName)}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded((prev) => new Set(prev).add(fileName));
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ── Navbar ──────────────────────────────────────── */}
      <motion.nav
        className="sticky top-0 z-30 bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)]/60"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="text-base font-bold tracking-tight text-[var(--text)] hover:opacity-70 transition-opacity">
            Fudsat
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <a href="/exams" className="text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors font-medium">
                  Exams
                </a>
                <span className="w-px h-4 bg-[var(--border)]" />
                <a href="/premium" className="text-xs sm:text-sm text-[var(--text)] font-semibold">
                  Premium Material
                </a>
                <span className="w-px h-4 bg-[var(--border)]" />
                <a href="/dashboard" className="text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors font-medium">
                  Analytics
                </a>
                <span className="w-px h-4 bg-[var(--border)]" />
                <button onClick={signOut} className="text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
                  Sign out
                </button>
              </>
            ) : (
              <a href="/auth/login" className="text-sm bg-[var(--accent)] text-white px-4 py-1.5 rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium">
                Sign in
              </a>
            )}
          </div>
        </div>
      </motion.nav>

      <div className="max-w-5xl mx-auto px-6 pb-24">
        {/* ── Hero header ─────────────────────────────── */}
        <motion.div
          className="pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 text-xs font-semibold tracking-wide mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            {TOTAL_FILES} RESOURCES READY
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text)] tracking-tight leading-tight">
            Premium Material
          </h1>
          <p className="text-base text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
            The only prep files you need. Download, study, dominate.
          </p>

          {/* Progress bar — gamified */}
          <motion.div
            className="mt-6 max-w-xs mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[var(--text-secondary)]">
                Downloaded
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={downloaded.size}
                  className="font-bold text-[var(--accent)]"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                >
                  {downloaded.size}/{TOTAL_FILES}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, var(--accent), #a855f7)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(downloaded.size / TOTAL_FILES) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {downloaded.size === TOTAL_FILES && downloaded.size > 0 && (
              <motion.p
                className="text-xs font-semibold text-[#059669] mt-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                All resources downloaded. You&apos;re locked in.
              </motion.p>
            )}
          </motion.div>
        </motion.div>

        {/* ── Category sections ───────────────────────── */}
        <div className="space-y-8">
          {CATEGORIES.map((cat, catIdx) => (
            <motion.section
              key={cat.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + catIdx * 0.07 }}
            >
              {/* Category header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cat.accentBg }}
                >
                  <svg className="w-4 h-4" style={{ color: cat.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text)] tracking-tight leading-none">
                    {cat.label}
                  </h2>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {cat.count} {cat.count === 1 ? "file" : "files"}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((pdf, i) => {
                  const isDone = downloaded.has(pdf.fileName);
                  return (
                    <motion.button
                      key={pdf.fileName}
                      onClick={() => handleDownload(pdf.fileName)}
                      className={`group relative text-left w-full rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                        isDone
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/25 hover:shadow-md hover:shadow-[var(--accent-glow)] hover:-translate-y-0.5"
                      }`}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 + catIdx * 0.07 + i * 0.04 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="inline-block text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                color: pdf.tagColor,
                                backgroundColor: pdf.tagColor + "20",
                              }}
                            >
                              {pdf.tag}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-[var(--text)] leading-snug group-hover:text-[var(--accent)] transition-colors">
                            {pdf.title}
                          </h3>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                            PDF
                          </p>
                        </div>

                        {/* Download / check icon */}
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          isDone
                            ? "bg-[#059669]/10"
                            : "bg-[var(--surface-2)] group-hover:bg-[var(--accent)] group-hover:shadow-lg group-hover:shadow-[var(--accent-glow)]"
                        }`}>
                          <AnimatePresence mode="wait">
                            {isDone ? (
                              <motion.svg
                                key="check"
                                className="w-4 h-4 text-[#059669]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </motion.svg>
                            ) : (
                              <motion.svg
                                key="download"
                                className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  );
}
