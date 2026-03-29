"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AttemptResult, QuestionResult } from "@/types/exam";
import { loadResult } from "@/lib/storage";
import { predictFullScore, PredictedScore, estimatePercentile } from "@/lib/scoring-engine";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/animations";

type Tab = "overview" | "review";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ResultsPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [predicted, setPredicted] = useState<PredictedScore | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "incorrect" | "unanswered" | "flagged"
  >("all");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    const data = loadResult(attemptId);
    setResult(data);
    if (data && data.hasAnswerKey) {
      const rwRaw = data.sections.find((s) => s.sectionName === "Reading and Writing")?.correct ?? 0;
      const mathRaw = data.sections.find((s) => s.sectionName === "Math")?.correct ?? 0;
      setPredicted(predictFullScore(rwRaw, mathRaw));
    }
  }, [attemptId]);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-[var(--text-secondary)] mb-4">Result not found</p>
          <a href="/exams" className="text-[var(--accent)] hover:underline">Back to exams</a>
        </motion.div>
      </div>
    );
  }

  const duration = result.submittedAt - result.startedAt;
  const durationMin = Math.floor(duration / 60000);

  const formatTime = (ms: number) => {
    if (ms < 1000) return "<1s";
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  };

  const filteredQuestions = result.questions.filter((q) => {
    if (reviewFilter === "incorrect") return q.isCorrect === false;
    if (reviewFilter === "unanswered") return !q.selectedAnswer;
    if (reviewFilter === "flagged") return q.confidenceFlag !== "high";
    return true;
  });

  return (
    <motion.div
      className="max-w-3xl mx-auto px-6 py-12"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.a
        href="/exams"
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] mb-8 inline-block transition-colors"
        variants={staggerItem}
      >
        ← Back to exams
      </motion.a>

      {/* Header */}
      <motion.div className="mb-8" variants={staggerItem}>
        <h1 className="text-2xl font-semibold mb-1">{result.examLabel}</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {new Date(result.submittedAt).toLocaleDateString()} &middot; {durationMin} minutes
        </p>
      </motion.div>

      {/* Predicted Score Banner */}
      {predicted && (
        <motion.div
          className="relative bg-gradient-to-br from-[var(--accent)] via-purple-600 to-indigo-800 text-white rounded-xl p-6 mb-8 overflow-hidden shadow-lg shadow-[var(--accent-glow)]"
          variants={staggerItem}
        >
          {/* Glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-purple-400/15 rounded-full blur-2xl pointer-events-none" />

          <motion.div
            className="relative grid grid-cols-4 gap-6 text-center"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <p className="text-xs opacity-70 mb-1">Predicted Score</p>
              <p className="text-3xl font-bold font-mono score-count">{predicted.total.midpoint}</p>
              <p className="text-xs opacity-60 mt-0.5 font-mono">{predicted.total.lower}–{predicted.total.upper}</p>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <p className="text-xs opacity-70 mb-1">Reading & Writing</p>
              <p className="text-2xl font-semibold font-mono score-count">{predicted.rw.midpoint}</p>
              <p className="text-xs opacity-60 mt-0.5 font-mono">{predicted.rw.lower}–{predicted.rw.upper}</p>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <p className="text-xs opacity-70 mb-1">Math</p>
              <p className="text-2xl font-semibold font-mono score-count">{predicted.math.midpoint}</p>
              <p className="text-xs opacity-60 mt-0.5 font-mono">{predicted.math.lower}–{predicted.math.upper}</p>
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <p className="text-xs opacity-70 mb-1">Percentile</p>
              <p className="text-2xl font-semibold font-mono score-count">{predicted.percentile}th</p>
              <p className="text-xs opacity-60 mt-0.5">nationally</p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Raw Score summary */}
      <motion.div className="grid grid-cols-3 gap-4 mb-8" variants={staggerItem}>
        {[
          {
            value: result.hasAnswerKey ? `${result.totalCorrect}/${result.totalQuestions}` : "—",
            label: result.hasAnswerKey ? "Raw Score" : "No answer key",
          },
          {
            value: `${result.totalAnswered}/${result.totalQuestions}`,
            label: "Answered",
          },
          {
            value: result.hasAnswerKey && result.totalCorrect !== null
              ? `${Math.round((result.totalCorrect / result.totalQuestions) * 100)}%`
              : "—",
            label: "Accuracy",
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
          >
            <p className="text-3xl font-semibold font-mono score-count">{card.value}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{card.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div className="flex gap-1 mb-6 border-b border-[var(--border)]" variants={staggerItem}>
        {(["overview", "review"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
              tab === t
                ? "border-[var(--accent)] text-[var(--text)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            {t === "overview" ? "Overview" : "Question Review"}
          </button>
        ))}
      </motion.div>

      {/* Overview tab */}
      <AnimatePresence mode="wait">
        {tab === "overview" && (
          <motion.div
            key="overview"
            className="space-y-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {result.sections.map((section, si) => (
              <motion.div
                key={section.sectionName}
                className="border border-[var(--border)] rounded-lg overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.1 }}
              >
                <div className="bg-[var(--surface-2)] px-4 py-3 flex items-center justify-between">
                  <span className="font-medium text-sm">{section.sectionName}</span>
                  <span className="text-sm text-[var(--text-secondary)] font-mono">
                    {section.correct !== null
                      ? `${section.correct}/${section.totalQuestions}`
                      : `${section.answered}/${section.totalQuestions} answered`}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {section.modules.map((mod) => (
                    <div key={mod.moduleId} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="text-sm">{mod.label}</span>
                        <span className="text-xs text-[var(--text-secondary)] ml-2">
                          {formatTime(mod.timeSpentMs)}
                        </span>
                      </div>
                      <div className="text-sm font-mono">
                        {mod.correct !== null ? (
                          <span>
                            <span className="font-medium">{mod.correct}</span>
                            <span className="text-[var(--text-secondary)]">/{mod.totalQuestions}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">
                            {mod.answered}/{mod.totalQuestions} answered
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {tab === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Review filter */}
            <div className="flex gap-2 mb-6">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "incorrect", label: "Incorrect" },
                  { key: "unanswered", label: "Unanswered" },
                  { key: "flagged", label: "Parse Issues" },
                ] as const
              ).map(({ key, label }) => (
                <motion.button
                  key={key}
                  onClick={() => setReviewFilter(key)}
                  className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                    reviewFilter === key
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {label}
                  {key === "incorrect" && result.hasAnswerKey
                    ? ` (${result.questions.filter((q) => q.isCorrect === false).length})`
                    : key === "unanswered"
                      ? ` (${result.questions.filter((q) => !q.selectedAnswer).length})`
                      : key === "flagged"
                        ? ` (${result.questions.filter((q) => q.confidenceFlag !== "high").length})`
                        : ""}
                </motion.button>
              ))}
            </div>

            {/* Question list */}
            <div className="space-y-2">
              {filteredQuestions.map((q, qi) => (
                <motion.div
                  key={q.questionId}
                  className="border border-[var(--border)] rounded-lg overflow-hidden hover:bg-[var(--surface)] transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(qi * 0.03, 0.5), duration: 0.3 }}
                >
                  <button
                    onClick={() =>
                      setExpandedQuestion(expandedQuestion === q.questionId ? null : q.questionId)
                    }
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--surface)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          q.isCorrect === true
                            ? "bg-[var(--correct)]"
                            : q.isCorrect === false
                              ? "bg-[var(--incorrect)]"
                              : !q.selectedAnswer
                                ? "bg-[var(--border)]"
                                : "bg-[var(--text-secondary)]"
                        }`}
                      />
                      <span className="text-sm">
                        <span className="text-[var(--text-secondary)]">{q.section} · {q.module} · </span>
                        Q{q.questionNumber}
                      </span>
                      {q.confidenceFlag !== "high" && (
                        <span className="text-xs text-[var(--warning)]">⚠</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[var(--text-secondary)]">{formatTime(q.timeSpentMs)}</span>
                      <motion.span
                        className="text-xs text-[var(--text-secondary)]"
                        animate={{ rotate: expandedQuestion === q.questionId ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        ▼
                      </motion.span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedQuestion === q.questionId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-[var(--border)] pt-4">
                          <div className="question-text text-sm mb-4 whitespace-pre-wrap leading-relaxed">
                            {q.prompt}
                          </div>
                          {q.isFreeResponse ? (
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-[var(--text-secondary)]">Your answer: </span>
                                <span className="font-medium">{q.selectedAnswer || "(blank)"}</span>
                              </div>
                              {q.correctAnswer && (
                                <div>
                                  <span className="text-[var(--text-secondary)]">Correct answer: </span>
                                  <span className="font-medium text-[var(--correct)]">{q.correctAnswer}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {q.options.map((opt) => {
                                const isSelected = q.selectedAnswer === opt.letter;
                                const isCorrectOpt = q.correctAnswer === opt.letter;
                                return (
                                  <div
                                    key={opt.letter}
                                    className={`px-3 py-2 rounded text-sm flex items-start gap-2 transition-colors ${
                                      isCorrectOpt
                                        ? "bg-emerald-50 border border-emerald-200"
                                        : isSelected && !isCorrectOpt
                                          ? "bg-red-50 border border-red-200"
                                          : "bg-[var(--surface-2)]"
                                    }`}
                                  >
                                    <span
                                      className={`font-medium flex-shrink-0 ${
                                        isCorrectOpt
                                          ? "text-[var(--correct)]"
                                          : isSelected
                                            ? "text-[var(--incorrect)]"
                                            : "text-[var(--text-secondary)]"
                                      }`}
                                    >
                                      {opt.letter}.
                                    </span>
                                    <span className="whitespace-pre-wrap">{opt.text}</span>
                                    {isSelected && (
                                      <span className="text-xs ml-auto flex-shrink-0">
                                        {isCorrectOpt ? "✓" : "✗"}
                                      </span>
                                    )}
                                    {!isSelected && isCorrectOpt && (
                                      <span className="text-xs ml-auto flex-shrink-0 text-[var(--correct)]">✓</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {filteredQuestions.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[var(--text-secondary)] py-8 text-sm"
              >
                No questions match this filter.
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
