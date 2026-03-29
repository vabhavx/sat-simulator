"use client";

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { QBQuestion, PracticeResponse } from "@/types/question-bank";
import {
  loadQuestionBank,
  loadSession,
  saveSession,
  deleteSession,
  computeResults,
  savePracticeResult,
  type StoredSession,
} from "@/lib/question-bank";

// ── Animation Variants ────────────────────────────────────────

const slideIn = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

const optionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

// ── Timer Component ───────────────────────────────────────────

function Timer({
  totalSeconds,
  onTimeUp,
  isPaused,
}: {
  totalSeconds: number;
  onTimeUp: () => void;
  isPaused: boolean;
}) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (isPaused || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, remaining, onTimeUp]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isWarning = remaining < 60;

  return (
    <div
      className={`flex items-center gap-1.5 text-sm font-mono tabular-nums ${
        isWarning ? "text-red-500" : "text-gray-600"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <motion.span
        animate={isWarning ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {mins}:{secs.toString().padStart(2, "0")}
      </motion.span>
    </div>
  );
}

// ── Question Navigator ────────────────────────────────────────

function QuestionNav({
  total,
  current,
  responses,
  questionIds,
  onNavigate,
}: {
  total: number;
  current: number;
  responses: Record<string, PracticeResponse>;
  questionIds: string[];
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const qId = questionIds[i];
        const resp = responses[qId];
        const isAnswered = resp?.selectedAnswer != null;
        const isFlagged = resp?.flagged;
        const isCurrent = i === current;

        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative ${
              isCurrent
                ? "bg-[#1e3a5f] text-white shadow-sm shadow-[#1e3a5f]/30"
                : isAnswered
                  ? "bg-[#1e3a5f]/10 text-[#1e3a5f] border border-[#1e3a5f]/20"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {i + 1}
            {isFlagged && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Submit Confirmation Modal ─────────────────────────────────

function SubmitModal({
  answered,
  total,
  flagged,
  onSubmit,
  onClose,
}: {
  answered: number;
  total: number;
  flagged: number;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const unanswered = total - answered;
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-glass-lg w-full max-w-sm mx-4 overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900">Submit Practice?</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Answered</span>
              <span className="font-medium text-gray-900">{answered}/{total}</span>
            </div>
            {unanswered > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Unanswered</span>
                <span className="font-medium text-amber-600">{unanswered}</span>
              </div>
            )}
            {flagged > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Flagged</span>
                <span className="font-medium text-amber-600">{flagged}</span>
              </div>
            )}
          </div>
          {unanswered > 0 && (
            <p className="text-xs text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg">
              You have {unanswered} unanswered question{unanswered > 1 ? "s" : ""}. These will be marked incorrect.
            </p>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Review
          </button>
          <motion.button
            onClick={onSubmit}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#1e3a5f] text-white hover:bg-[#2a4f7a] transition-colors"
            whileTap={{ scale: 0.97 }}
          >
            Submit
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Practice Session ─────────────────────────────────────

function PracticeSessionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");

  const [session, setSession] = useState<StoredSession | null>(null);
  const [questions, setQuestions] = useState<QBQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [crossedOut, setCrossedOut] = useState<Record<string, Set<string>>>({});
  const [showCrossOut, setShowCrossOut] = useState(false);

  const questionStartTime = useRef(Date.now());

  // Load session and questions
  useEffect(() => {
    if (!sessionId) {
      router.push("/question-bank");
      return;
    }

    const stored = loadSession(sessionId);
    if (!stored) {
      router.push("/question-bank");
      return;
    }

    loadQuestionBank().then((bank) => {
      const qMap = new Map(bank.questions.map((q) => [q.id, q]));
      const sessionQuestions = stored.questionIds
        .map((id) => qMap.get(id))
        .filter(Boolean) as QBQuestion[];

      setSession(stored);
      setQuestions(sessionQuestions);
      setLoading(false);
    });
  }, [sessionId, router]);

  const currentIndex = session?.currentIndex ?? 0;
  const currentQuestion = questions[currentIndex];
  const responses = session?.responses ?? {};
  const currentResponse = currentQuestion ? responses[currentQuestion.id] : undefined;

  // Track time on question change
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentIndex]);

  const recordTimeOnQuestion = useCallback(() => {
    if (!session || !currentQuestion) return;
    const elapsed = Date.now() - questionStartTime.current;
    const existing = session.responses[currentQuestion.id];
    const updatedResp: PracticeResponse = {
      questionId: currentQuestion.id,
      selectedAnswer: existing?.selectedAnswer || null,
      timeSpentMs: (existing?.timeSpentMs || 0) + elapsed,
      flagged: existing?.flagged || false,
    };
    session.responses[currentQuestion.id] = updatedResp;
    questionStartTime.current = Date.now();
  }, [session, currentQuestion]);

  const selectAnswer = useCallback(
    (letter: string) => {
      if (!session || !currentQuestion) return;
      const elapsed = Date.now() - questionStartTime.current;
      const existing = session.responses[currentQuestion.id];
      const updatedResp: PracticeResponse = {
        questionId: currentQuestion.id,
        selectedAnswer:
          existing?.selectedAnswer === letter ? null : letter,
        timeSpentMs: (existing?.timeSpentMs || 0) + elapsed,
        flagged: existing?.flagged || false,
      };
      session.responses[currentQuestion.id] = updatedResp;
      questionStartTime.current = Date.now();

      const updated = { ...session };
      setSession(updated);
      saveSession(updated);
    },
    [session, currentQuestion]
  );

  const toggleFlag = useCallback(() => {
    if (!session || !currentQuestion) return;
    const existing = session.responses[currentQuestion.id];
    const updatedResp: PracticeResponse = {
      questionId: currentQuestion.id,
      selectedAnswer: existing?.selectedAnswer || null,
      timeSpentMs: existing?.timeSpentMs || 0,
      flagged: !existing?.flagged,
    };
    session.responses[currentQuestion.id] = updatedResp;

    const updated = { ...session };
    setSession(updated);
    saveSession(updated);
  }, [session, currentQuestion]);

  const navigateTo = useCallback(
    (index: number) => {
      if (!session || index < 0 || index >= questions.length) return;
      recordTimeOnQuestion();
      session.currentIndex = index;
      const updated = { ...session };
      setSession(updated);
      saveSession(updated);
      setShowNav(false);
    },
    [session, questions.length, recordTimeOnQuestion]
  );

  const goNext = useCallback(() => {
    navigateTo(currentIndex + 1);
  }, [navigateTo, currentIndex]);

  const goPrev = useCallback(() => {
    navigateTo(currentIndex - 1);
  }, [navigateTo, currentIndex]);

  const handleSubmit = useCallback(() => {
    if (!session) return;
    recordTimeOnQuestion();

    const result = computeResults(
      session.config,
      questions,
      session.responses,
      session.startedAt
    );

    savePracticeResult(result);
    deleteSession(session.config.id);
    router.push(`/practice/results?id=${session.config.id}`);
  }, [session, questions, router, recordTimeOnQuestion]);

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "n") goNext();
      else if (e.key === "ArrowLeft" || e.key === "p") goPrev();
      else if (e.key === "a" || e.key === "A") selectAnswer("A");
      else if (e.key === "b" || e.key === "B") selectAnswer("B");
      else if (e.key === "c" || e.key === "C") selectAnswer("C");
      else if (e.key === "d" || e.key === "D") selectAnswer("D");
      else if (e.key === "f") toggleFlag();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, selectAnswer, toggleFlag]);

  // Stats
  const answeredCount = useMemo(
    () =>
      Object.values(responses).filter((r) => r.selectedAnswer != null).length,
    [responses]
  );
  const flaggedCount = useMemo(
    () => Object.values(responses).filter((r) => r.flagged).length,
    [responses]
  );

  if (loading || !currentQuestion || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFlagged = currentResponse?.flagged;
  const selectedAnswer = currentResponse?.selectedAnswer || null;
  const questionCrossedOut = crossedOut[currentQuestion.id] || new Set();
  const totalTime = session.config.timed
    ? session.config.timePerQuestion * questions.length
    : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Back + Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (confirm("Leave practice? Your progress will be saved.")) {
                  recordTimeOnQuestion();
                  saveSession(session);
                  router.push("/question-bank");
                }
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {session.config.domain || "All R&W"}
                {session.config.skill && ` — ${session.config.skill}`}
              </p>
            </div>
          </div>

          {/* Center: Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {currentIndex + 1}
              <span className="text-gray-400 font-normal"> / {questions.length}</span>
            </span>
            <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
              <motion.div
                className="h-full bg-[#1e3a5f] rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Right: Timer + Actions */}
          <div className="flex items-center gap-3">
            {session.config.timed && totalTime > 0 && (
              <Timer
                totalSeconds={totalTime}
                onTimeUp={handleTimeUp}
                isPaused={false}
              />
            )}

            <button
              onClick={() => setShowNav(!showNav)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                showNav
                  ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                  : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}
              title="Question navigator"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>

            <motion.button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#1e3a5f] text-white hover:bg-[#2a4f7a] transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              Submit
            </motion.button>
          </div>
        </div>

        {/* Question Navigator Dropdown */}
        <AnimatePresence>
          {showNav && (
            <motion.div
              className="border-t border-gray-100 bg-white px-4 py-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="max-w-6xl mx-auto">
                <QuestionNav
                  total={questions.length}
                  current={currentIndex}
                  responses={responses}
                  questionIds={session.questionIds}
                  onNavigate={navigateTo}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            {...slideIn}
            className="space-y-6"
          >
            {/* Question Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#1e3a5f]/[0.06] text-[#1e3a5f]">
                {currentQuestion.domain}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                {currentQuestion.skill}
              </span>
              <DifficultyBadge difficulty={currentQuestion.difficulty} />
            </div>

            {/* Passage */}
            {currentQuestion.passage && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6">
                <p className="text-[15px] leading-[1.8] text-gray-800 whitespace-pre-wrap">
                  {currentQuestion.passage}
                </p>
              </div>
            )}

            {/* Question Stem */}
            {currentQuestion.question && (
              <p className="text-[15px] leading-relaxed text-gray-900 font-medium">
                {currentQuestion.question}
              </p>
            )}

            {/* Answer Choices */}
            <div className="space-y-2.5" role="radiogroup">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = selectedAnswer === opt.letter;
                const isCrossed = questionCrossedOut.has(opt.letter);

                return (
                  <motion.div
                    key={opt.letter}
                    className="group relative flex items-start"
                    custom={i}
                    variants={optionVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {/* Cross-out toggle */}
                    <AnimatePresence>
                      {showCrossOut && (
                        <motion.button
                          initial={{ opacity: 0, width: 0, marginRight: 0 }}
                          animate={{ opacity: 1, width: 24, marginRight: 8 }}
                          exit={{ opacity: 0, width: 0, marginRight: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCrossedOut((prev) => {
                              const set = new Set(prev[currentQuestion.id] || []);
                              if (set.has(opt.letter)) set.delete(opt.letter);
                              else set.add(opt.letter);
                              return { ...prev, [currentQuestion.id]: set };
                            });
                          }}
                          className={`flex-shrink-0 h-6 mt-3.5 flex items-center justify-center rounded-md transition-all ${
                            isCrossed
                              ? "bg-gray-800 text-white"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <motion.button
                      onClick={() => {
                        if (isCrossed) {
                          setCrossedOut((prev) => {
                            const set = new Set(prev[currentQuestion.id] || []);
                            set.delete(opt.letter);
                            return { ...prev, [currentQuestion.id]: set };
                          });
                        }
                        selectAnswer(opt.letter);
                      }}
                      className={`flex-1 text-left rounded-xl border-2 transition-all duration-200 flex items-start gap-3 px-4 py-3 ${
                        isCrossed
                          ? "opacity-35 border-gray-200 bg-gray-50/80"
                          : isSelected
                            ? "border-[#1e3a5f] bg-gradient-to-r from-[#1e3a5f]/[0.04] to-[#1e3a5f]/[0.02] shadow-[0_0_0_1px_rgba(30,58,95,0.08),0_2px_8px_rgba(30,58,95,0.06)]"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                      }`}
                      whileTap={{ scale: 0.995 }}
                    >
                      <motion.span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 transition-all ${
                          isSelected
                            ? "bg-[#1e3a5f] text-white shadow-sm"
                            : "border-2 border-gray-300 text-gray-400"
                        }`}
                        animate={
                          isSelected
                            ? { scale: [1, 1.12, 1], transition: { duration: 0.3 } }
                            : { scale: 1 }
                        }
                      >
                        {isSelected ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          opt.letter
                        )}
                      </motion.span>
                      <span
                        className={`text-[15px] leading-relaxed whitespace-pre-wrap ${
                          isCrossed
                            ? "line-through text-gray-400"
                            : isSelected
                              ? "text-gray-900"
                              : "text-gray-700"
                        }`}
                      >
                        {opt.text}
                      </span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFlag}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isFlagged
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isFlagged ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              {isFlagged ? "Flagged" : "Flag"}
            </button>

            <button
              onClick={() => setShowCrossOut(!showCrossOut)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showCrossOut
                  ? "bg-gray-100 text-gray-700"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cross out
            </button>
          </div>

          {/* Right: Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            {currentIndex < questions.length - 1 ? (
              <motion.button
                onClick={goNext}
                className="flex items-center gap-1 px-5 py-2 rounded-lg text-sm font-semibold bg-[#1e3a5f] text-white hover:bg-[#2a4f7a] transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </motion.button>
            ) : (
              <motion.button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Finish
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <SubmitModal
            answered={answeredCount}
            total={questions.length}
            flagged={flaggedCount}
            onSubmit={handleSubmit}
            onClose={() => setShowSubmitModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    Easy: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Medium: "bg-amber-50 text-amber-600 border-amber-100",
    Hard: "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
        colors[difficulty] || colors.Medium
      }`}
    >
      {difficulty}
    </span>
  );
}

export default function PracticeSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
          <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PracticeSessionInner />
    </Suspense>
  );
}
