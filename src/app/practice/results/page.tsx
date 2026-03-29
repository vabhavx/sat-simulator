"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { PracticeSessionResult, PracticeQuestionResult } from "@/types/question-bank";
import { loadPracticeResult } from "@/lib/question-bank";

// ── Variants ──────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// ── Score Ring ─────────────────────────────────────────────────

function ScoreRing({ score, total, size = 160 }: { score: number; total: number; size?: number }) {
  const pct = total > 0 ? score / total : 0;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  const color =
    pct >= 0.8 ? "#059669" : pct >= 0.6 ? "#d97706" : pct >= 0.4 ? "#ea580c" : "#dc2626";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="8"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold text-gray-900 tabular-nums"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] as const }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-gray-400">of {total}</span>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtext,
  color = "text-gray-900",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}) {
  return (
    <motion.div
      className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center"
      variants={fadeUp}
    >
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </motion.div>
  );
}

// ── Domain Bar ────────────────────────────────────────────────

function DomainBar({
  domain,
  correct,
  total,
  accuracy,
}: {
  domain: string;
  correct: number;
  total: number;
  accuracy: number;
}) {
  const color =
    accuracy >= 80 ? "bg-emerald-500" : accuracy >= 60 ? "bg-amber-500" : "bg-red-500";
  const textColor =
    accuracy >= 80 ? "text-emerald-600" : accuracy >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <motion.div className="space-y-1.5" variants={fadeUp}>
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-gray-700">{domain}</span>
        <span className={`text-sm font-bold tabular-nums ${textColor}`}>
          {accuracy}%
          <span className="text-gray-400 font-normal text-xs ml-1">
            ({correct}/{total})
          </span>
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${accuracy}%` }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}

// ── Question Review Card ──────────────────────────────────────

function QuestionReviewCard({
  q,
  index,
  expanded,
  onToggle,
}: {
  q: PracticeQuestionResult;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      className={`rounded-xl border overflow-hidden transition-all ${
        q.isCorrect
          ? "border-emerald-100 bg-emerald-50/30"
          : q.selectedAnswer
            ? "border-red-100 bg-red-50/30"
            : "border-gray-100 bg-gray-50/30"
      }`}
      variants={fadeUp}
      layout
    >
      {/* Summary Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            q.isCorrect
              ? "bg-emerald-500 text-white"
              : q.selectedAnswer
                ? "bg-red-500 text-white"
                : "bg-gray-300 text-white"
          }`}
        >
          {q.isCorrect ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : q.selectedAnswer ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            "—"
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 truncate">
            <span className="font-medium text-gray-500">Q{index + 1}</span>{" "}
            {q.question || q.passage.substring(0, 100) + "..."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{q.skill}</span>
          <DifficultyDots difficulty={q.difficulty} />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
              {/* Passage */}
              {q.passage && (
                <div className="bg-white rounded-lg border border-gray-100 p-4">
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {q.passage}
                  </p>
                </div>
              )}

              {/* Question */}
              {q.question && (
                <p className="text-sm font-medium text-gray-800">{q.question}</p>
              )}

              {/* Options with correct/incorrect indicators */}
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const isCorrect = opt.letter === q.correctAnswer;
                  const isSelected = opt.letter === q.selectedAnswer;
                  const isWrongSelected = isSelected && !isCorrect;

                  return (
                    <div
                      key={opt.letter}
                      className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm ${
                        isCorrect
                          ? "bg-emerald-50 border border-emerald-200"
                          : isWrongSelected
                            ? "bg-red-50 border border-red-200"
                            : "bg-gray-50 border border-transparent"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCorrect
                            ? "bg-emerald-500 text-white"
                            : isWrongSelected
                              ? "bg-red-500 text-white"
                              : "border border-gray-300 text-gray-400"
                        }`}
                      >
                        {isCorrect ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : isWrongSelected ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        ) : (
                          opt.letter
                        )}
                      </span>
                      <span
                        className={`leading-relaxed ${
                          isCorrect
                            ? "text-emerald-800"
                            : isWrongSelected
                              ? "text-red-700 line-through"
                              : "text-gray-600"
                        }`}
                      >
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rationale */}
              {q.rationale && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                    Explanation
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">{q.rationale}</p>
                </div>
              )}

              {/* Your answer vs correct */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-400">
                  Your answer:{" "}
                  <span className={`font-bold ${q.isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                    {q.selectedAnswer || "Skipped"}
                  </span>
                </span>
                <span className="text-gray-400">
                  Correct: <span className="font-bold text-emerald-600">{q.correctAnswer}</span>
                </span>
                <span className="text-gray-400">
                  Time: <span className="font-medium text-gray-600">{(q.timeSpentMs / 1000).toFixed(0)}s</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DifficultyDots({ difficulty }: { difficulty: string }) {
  const filled = difficulty === "Easy" ? 1 : difficulty === "Medium" ? 2 : 3;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-sm ${
            i <= filled ? "bg-[#1e3a5f]" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main Results Page ─────────────────────────────────────────

function PracticeResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");

  const [result, setResult] = useState<PracticeSessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "skipped">("all");

  useEffect(() => {
    if (!sessionId) {
      router.push("/question-bank");
      return;
    }
    const r = loadPracticeResult(sessionId);
    if (!r) {
      router.push("/question-bank");
      return;
    }
    setResult(r);
    setLoading(false);
  }, [sessionId, router]);

  const filteredQuestions = useMemo(() => {
    if (!result) return [];
    return result.questions.filter((q) => {
      if (filter === "correct") return q.isCorrect;
      if (filter === "incorrect") return q.selectedAnswer && !q.isCorrect;
      if (filter === "skipped") return !q.selectedAnswer;
      return true;
    });
  }, [result, filter]);

  if (loading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const duration = result.completedAt - result.startedAt;
  const mins = Math.floor(duration / 60000);
  const secs = Math.floor((duration % 60000) / 1000);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a
            href="/question-bank"
            className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Question Bank</span>
          </a>
          <motion.button
            onClick={() => router.push("/question-bank")}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#1e3a5f] text-white hover:bg-[#2a4f7a] transition-colors"
            whileTap={{ scale: 0.97 }}
          >
            Practice More
          </motion.button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Score Section */}
          <motion.div
            className="flex flex-col items-center mb-8"
            variants={fadeUp}
          >
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              Practice Complete
            </p>
            <ScoreRing score={result.totalCorrect} total={result.totalQuestions} />
            <motion.p
              className="text-lg font-bold text-gray-900 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {result.accuracy}% Accuracy
            </motion.p>
            <motion.p
              className="text-sm text-gray-400 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              {result.config.domain || "All Reading & Writing"}
              {result.config.skill && ` — ${result.config.skill}`}
            </motion.p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8" variants={stagger}>
            <StatCard label="Correct" value={result.totalCorrect} color="text-emerald-600" />
            <StatCard label="Incorrect" value={result.totalIncorrect} color="text-red-600" />
            <StatCard label="Skipped" value={result.totalSkipped} color="text-gray-500" />
            <StatCard
              label="Time"
              value={`${mins}m ${secs}s`}
              subtext={`~${(result.avgTimePerQuestion / 1000).toFixed(0)}s/question`}
            />
          </motion.div>

          {/* Domain Breakdown */}
          {result.domainBreakdown.length > 1 && (
            <motion.div
              className="bg-white rounded-2xl border border-gray-100 p-5 mb-8"
              variants={fadeUp}
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Domain Performance</h3>
              <div className="space-y-4">
                {result.domainBreakdown.map((d) => (
                  <DomainBar
                    key={d.domain}
                    domain={d.domain}
                    correct={d.correct}
                    total={d.total}
                    accuracy={d.accuracy}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Skill Breakdown */}
          {result.skillBreakdown.length > 1 && (
            <motion.div
              className="bg-white rounded-2xl border border-gray-100 p-5 mb-8"
              variants={fadeUp}
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Skill Performance</h3>
              <div className="space-y-4">
                {result.skillBreakdown.map((s) => (
                  <DomainBar
                    key={`${s.domain}-${s.skill}`}
                    domain={s.skill}
                    correct={s.correct}
                    total={s.total}
                    accuracy={s.accuracy}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Difficulty Breakdown */}
          <motion.div
            className="bg-white rounded-2xl border border-gray-100 p-5 mb-8"
            variants={fadeUp}
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-4">By Difficulty</h3>
            <div className="grid grid-cols-3 gap-4">
              {["Easy", "Medium", "Hard"].map((diff) => {
                const d = result.difficultyBreakdown.find((x) => x.difficulty === diff);
                if (!d) return null;
                return (
                  <div key={diff} className="text-center">
                    <p className="text-xs font-medium text-gray-400 mb-1">{diff}</p>
                    <p className={`text-xl font-bold tabular-nums ${
                      d.accuracy >= 80 ? "text-emerald-600" : d.accuracy >= 60 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {d.accuracy}%
                    </p>
                    <p className="text-xs text-gray-400">{d.correct}/{d.total}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Question Review */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Question Review</h3>
              <div className="flex gap-1">
                {(["all", "correct", "incorrect", "skipped"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      filter === f
                        ? "bg-[#1e3a5f] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {f === "all" ? `All (${result.totalQuestions})` :
                     f === "correct" ? `Correct (${result.totalCorrect})` :
                     f === "incorrect" ? `Wrong (${result.totalIncorrect})` :
                     `Skipped (${result.totalSkipped})`}
                  </button>
                ))}
              </div>
            </div>

            <motion.div className="space-y-2" variants={stagger}>
              {filteredQuestions.map((q, i) => {
                const originalIndex = result.questions.indexOf(q);
                return (
                  <QuestionReviewCard
                    key={q.questionId}
                    q={q}
                    index={originalIndex}
                    expanded={expandedQuestion === originalIndex}
                    onToggle={() =>
                      setExpandedQuestion(
                        expandedQuestion === originalIndex ? null : originalIndex
                      )
                    }
                  />
                );
              })}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PracticeResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
          <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PracticeResultsInner />
    </Suspense>
  );
}
