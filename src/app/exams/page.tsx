"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ExamEntry } from "@/types/exam";
import { getActiveAttemptForExam, getAllResults } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/animations";
import Navbar from "@/components/Navbar";

// ── Variants (snappy) ──────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.025, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// ── Helpers ─────────────────────────────────────────────────

function regionLabel(type: string) {
  if (type === "International") return "INT";
  if (type === "US") return "US";
  return "—";
}

function regionColor(type: string) {
  if (type === "International") return "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800";
  if (type === "US") return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800";
  return "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-700";
}

function monthLabel(month: string) {
  if (month === "CB") return "College Board";
  return month;
}

// ── Stat Card ───────────────────────────────────────────────

function StatBlock({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center px-2 sm:px-5 min-w-0">
      <p className="text-base sm:text-xl font-semibold text-[var(--text)] tabular-nums">{value}</p>
      <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider font-medium truncate">{label}</p>
    </div>
  );
}

// ── Exam Card ───────────────────────────────────────────────

function ExamCard({
  exam,
  isActive,
  featured = false,
}: {
  exam: ExamEntry;
  isActive: boolean;
  featured?: boolean;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Link
        href={`/exam/${exam.id}`}
        className={`group relative flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-200 hover:border-[var(--accent)]/25 hover:shadow-[0_2px_16px_rgba(99,102,241,0.08)] active:scale-[0.98] ${
          featured ? "row-span-2 min-h-[220px]" : "min-h-[140px] sm:min-h-[160px]"
        }`}
      >
        {/* Accent bar */}
        <div className={`absolute top-0 inset-x-0 h-[3px] ${
          exam.hasAnswerKey
            ? "bg-gradient-to-r from-[var(--accent)] to-purple-500"
            : "bg-gradient-to-r from-[var(--surface-3)] to-[var(--border)]"
        } opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          {/* Top row: badges */}
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className={`inline-flex items-center text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border ${regionColor(exam.type)}`}>
              {regionLabel(exam.type)}
            </span>
            <div className="flex items-center gap-1.5">
              {exam.hasAnswerKey && (
                <span className="inline-flex items-center text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                  Key
                </span>
              )}
              {isActive && (
                <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 px-1.5 py-0.5 rounded animate-pulse">
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className={`font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors duration-150 leading-snug ${
            featured ? "text-lg" : "text-[15px]"
          }`}>
            {monthLabel(exam.month)} {exam.year}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{exam.version}</p>

          <div className="flex-1" />

          {/* Footer meta */}
          <div className="flex items-center justify-between mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[var(--border)]/60">
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-[var(--text-secondary)]">
              <span className="tabular-nums">{exam.totalQuestions} Q</span>
              <span className="w-px h-3 bg-[var(--border)]" />
              <span>{exam.type === "Unknown" ? "Practice" : exam.type}</span>
            </div>
            <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all duration-150 font-medium">
              Start →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────────────

type FilterType = "all" | "International" | "US";

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [activeAttempts, setActiveAttempts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/data/catalog.json")
      .then((res) => {
        if (!res.ok) throw new Error("Catalog not found. Run: npm run parse");
        return res.json();
      })
      .then((data: ExamEntry[]) => {
        const parsedExams = data.filter((e) => e.totalQuestions > 0);
        setExams(parsedExams);
        const active: Record<string, boolean> = {};
        data.forEach((exam) => {
          const attempt = getActiveAttemptForExam(exam.id);
          if (attempt) active[exam.id] = true;
        });
        setActiveAttempts(active);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () => exams.filter((e) => filter === "all" || e.type === filter),
    [exams, filter]
  );

  const grouped = useMemo(() => {
    const g: Record<number, ExamEntry[]> = {};
    filtered.forEach((exam) => {
      if (!g[exam.year]) g[exam.year] = [];
      g[exam.year].push(exam);
    });
    return g;
  }, [filtered]);

  const years = useMemo(
    () => Object.keys(grouped).map(Number).sort((a, b) => b - a),
    [grouped]
  );

  const intCount = exams.filter((e) => e.type === "International").length;
  const usCount = exams.filter((e) => e.type === "US").length;
  const withKeys = exams.filter((e) => e.hasAnswerKey).length;
  const latestExam = exams.length > 0 ? exams[0] : null;

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: exams.length },
    { key: "International", label: "International", count: intCount },
    { key: "US", label: "US", count: usCount },
  ];

  // ── Loading ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
            <LoadingSpinner size={28} />
            <p className="text-[var(--text-secondary)] text-sm">Loading exams...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md px-6">
            <p className="text-[var(--incorrect)] mb-4 font-medium">{error}</p>
            <div className="bg-[var(--surface)] p-4 rounded-lg text-sm text-left font-mono border border-[var(--border)]">
              <p>cd sat-simulator</p>
              <p>npm run parse</p>
              <p>npm run dev</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {/* ── Header ──────────────────────────────────── */}
        <motion.div
          className="pt-6 pb-5 sm:pt-10 sm:pb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <h1 className="text-xl sm:text-3xl font-bold text-[var(--text)] tracking-tight">Exam Library</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-lg">
            Full-length Digital SAT practice exams. Timed, scored, and reviewed.
          </p>
        </motion.div>

        {/* ── Question Bank CTA ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <Link
            href="/question-bank"
            className="group relative flex items-center justify-between bg-gradient-to-r from-[#1e3a5f] to-[#2a4f7a] rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-5 sm:mb-6 overflow-hidden active:scale-[0.995] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="relative z-10 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 flex-shrink-0">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span className="text-[10px] sm:text-xs font-semibold text-white/70 uppercase tracking-wider">Question Bank</span>
              </div>
              <p className="text-base sm:text-xl font-bold text-white">938 R&W Questions</p>
              <p className="text-xs sm:text-sm text-white/60 mt-0.5 hidden sm:block">Categorized by domain, skill, and difficulty</p>
            </div>
            <div className="relative z-10 flex-shrink-0 ml-3">
              <span className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/15 text-white text-xs sm:text-sm font-semibold group-hover:bg-white/25 transition-colors">
                Explore
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        </motion.div>

        {/* ── Stats strip ─────────────────────────────── */}
        <motion.div
          className="flex items-center bg-[var(--surface)] rounded-xl border border-[var(--border)]/60 p-2.5 sm:p-4 mb-5 sm:mb-8 divide-x divide-[var(--border)] overflow-x-auto"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <StatBlock value={exams.length} label="Exams" />
          <StatBlock value={intCount} label="INT" />
          <StatBlock value={usCount} label="US" />
          <StatBlock value={withKeys} label="Keys" />
          {latestExam && (
            <div className="hidden sm:block text-center px-5 min-w-0">
              <p className="text-sm font-semibold text-[var(--text)] truncate max-w-[140px]">
                {monthLabel(latestExam.month)} {latestExam.year}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider font-medium">Latest</p>
            </div>
          )}
        </motion.div>

        {/* ── Filters ─────────────────────────────────── */}
        <motion.div
          className="flex items-center gap-1.5 mb-5 sm:mb-8 overflow-x-auto pb-1"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <div className="flex bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)]/50">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`relative px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
                  filter === f.key
                    ? "bg-[var(--surface-2)] text-[var(--text)] shadow-sm border border-[var(--border)]/60"
                    : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                }`}
              >
                {f.label}
                <span className={`ml-1 text-[10px] tabular-nums ${
                  filter === f.key ? "text-[var(--text-secondary)]" : "text-[var(--text-secondary)]/60"
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Exam Grid ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            variants={stagger}
          >
            {years.map((year, yi) => {
              const yearExams = grouped[year];
              return (
                <section key={year} className={yi > 0 ? "mt-8 sm:mt-12" : ""}>
                  <motion.div className="flex items-center gap-3 mb-4" variants={fadeUp}>
                    <h2 className="text-sm font-semibold text-[var(--text)] tracking-wide">{year}</h2>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-[11px] text-[var(--text-secondary)] tabular-nums font-medium">
                      {yearExams.length} exam{yearExams.length !== 1 ? "s" : ""}
                    </span>
                  </motion.div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {yearExams.map((exam) => (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        isActive={!!activeAttempts[exam.id]}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <p className="text-[var(--text-secondary)] text-sm">No exams match this filter.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
