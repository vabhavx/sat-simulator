"use client";

import { useState, memo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useExamSession } from "@/hooks/useExamSession";
import ExamHeader from "@/components/exam/ExamHeader";
import QuestionNavigator from "@/components/exam/QuestionNavigator";
import AnswerChoices from "@/components/exam/AnswerChoices";
import MarkForReview from "@/components/exam/MarkForReview";
import BreakScreen from "@/components/exam/BreakScreen";
import SubmitConfirmModal from "@/components/exam/SubmitConfirmModal";
import ModuleReviewScreen from "@/components/exam/ModuleReviewScreen";
import DesmosCalculator from "@/components/tools/DesmosCalculator";
import MathReferenceSheet from "@/components/tools/MathReferenceSheet";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/animations";
import type {
  Section,
  Module,
  Question,
  ModuleState,
  AttemptState,
} from "@/types/exam";

// ── Animation Variants (lightning-fast, GPU-friendly) ───────

const questionVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
    filter: "blur(2px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -24 : 24,
    opacity: 0,
    filter: "blur(2px)",
    transition: { duration: 0.1 },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

// ── Answer Eliminator Toggle ────────────────────────────────

function AnswerEliminatorToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        active
          ? "bg-[var(--accent)] text-white shadow-sm"
          : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent-hover)] hover:text-[var(--text)] hover:shadow-sm"
      }`}
      title={active ? "Disable answer eliminator" : "Enable answer eliminator"}
      aria-label="Toggle answer eliminator"
      aria-pressed={active}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <text x="3" y="16" fontSize="12" fontFamily="system-ui" fontWeight="600" fill="currentColor" stroke="none">ABC</text>
        <line x1="2" y1="4" x2="22" y2="20" strokeWidth="2.5" />
      </svg>
      <span className="hidden sm:inline">{active ? "On" : "Eliminate"}</span>
    </button>
  );
}

// ── Progress Dots ───────────────────────────────────────────

function ProgressDots({ total, answered, current }: { total: number; answered: number; current: number }) {
  return (
    <div className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: Math.min(total, 40) }, (_, i) => {
        const isAnswered = i < answered;
        const isCurrent = i === current;
        return (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              isCurrent
                ? "w-3 bg-[var(--accent)]"
                : isAnswered
                  ? "w-1.5 bg-[var(--accent)]/40"
                  : "w-1.5 bg-[var(--border)]"
            }`}
          />
        );
      })}
    </div>
  );
}

// ── Memoized Exam Content ───────────────────────────────────

interface ExamContentProps {
  state: AttemptState;
  currentSection: Section;
  currentModule: Module;
  currentQuestion: Question;
  modState: ModuleState;
  currentResponse: { selectedAnswer: string | null; flagged: boolean } | undefined;
  timeRemaining: number;
  timerHidden: boolean;
  onToggleTimer: () => void;
  showCalculator: boolean;
  onToggleCalculator: () => void;
  showReference: boolean;
  onToggleReference: () => void;
  navExpanded: boolean;
  onToggleNav: () => void;
  navDirection: number;
  responseMap: Map<string, { answered: boolean; flagged: boolean }>;
  crossedOut: Record<string, Set<string>>;
  unansweredCount: number;
  markedCount: number;
  eliminatorActive: boolean;
  onToggleEliminator: () => void;
  onAnswer: (answer: string) => void;
  onFreeResponse: (value: string) => void;
  onFlag: () => void;
  onNav: (dir: "prev" | "next") => void;
  onGoTo: (idx: number) => void;
  onSubmitModule: () => void;
  onToggleCrossOut: (questionId: string, letter: string) => void;
}

const ExamContent = memo(function ExamContent(props: ExamContentProps) {
  const {
    state, currentSection, currentModule, currentQuestion, modState,
    currentResponse, timeRemaining, timerHidden, onToggleTimer,
    showCalculator, onToggleCalculator, showReference, onToggleReference,
    navExpanded, onToggleNav, navDirection, responseMap, crossedOut,
    unansweredCount, markedCount, eliminatorActive, onToggleEliminator,
    onAnswer, onFreeResponse, onFlag, onNav, onGoTo, onSubmitModule, onToggleCrossOut,
  } = props;

  const sectionType = currentSection.name.toLowerCase().includes("math") ? "math" : "rw";
  const isFirst = state.currentQuestionIndex === 0;
  const isLast = state.currentQuestionIndex === currentModule.questions.length - 1;
  const questionCrossedOut = crossedOut[currentQuestion.id] || new Set<string>();
  const answeredCount = Array.from(responseMap.values()).filter(r => r.answered).length;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)]">
      {/* ── Header ──────────────────────────────────── */}
      <ExamHeader
        sectionName={currentSection.name}
        moduleLabel={currentModule.label}
        sectionType={sectionType as "rw" | "math"}
        timeRemaining={timeRemaining}
        timerHidden={timerHidden}
        onToggleTimer={onToggleTimer}
        onToggleCalculator={onToggleCalculator}
        onToggleReference={onToggleReference}
        calculatorOpen={showCalculator}
        referenceOpen={showReference}
      />

      {/* ── Question Toolbar ────────────────────────── */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-[var(--accent)] tabular-nums">
              {state.currentQuestionIndex + 1}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
              of {currentModule.questions.length}
            </span>
          </div>
          <span className="w-px h-4 bg-[var(--border)]" />
          <MarkForReview
            marked={currentResponse?.flagged ?? false}
            onToggle={onFlag}
          />
        </div>
        <div className="flex items-center gap-2">
          {!currentQuestion.isFreeResponse && (
            <AnswerEliminatorToggle active={eliminatorActive} onToggle={onToggleEliminator} />
          )}
        </div>
      </div>

      {/* ── Progress indicator ──────────────────────── */}
      <div className="bg-[var(--surface)] px-4 sm:px-6 py-1.5 border-b border-[var(--border)]">
        <ProgressDots
          total={currentModule.questions.length}
          answered={answeredCount}
          current={state.currentQuestionIndex}
        />
      </div>

      {/* ── Question Content ────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait" custom={navDirection}>
          <motion.div
            key={currentQuestion.id}
            custom={navDirection}
            variants={questionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="max-w-2xl mx-auto px-5 sm:px-8 py-6 sm:py-8"
          >
            {/* Confidence warning */}
            {currentQuestion.confidenceFlag !== "high" && (
              <div className="mb-5 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2.5" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{currentQuestion.flagReason || "This question may have parsing issues"}</span>
              </div>
            )}

            {/* Question prompt */}
            <div className="mb-8">
              <div className="text-[15px] sm:text-base leading-[1.8] whitespace-pre-wrap text-[var(--text)] selection:bg-[var(--accent)]/20" role="document">
                {currentQuestion.prompt}
              </div>
            </div>

            {/* Answers */}
            {currentQuestion.isFreeResponse ? (
              <div className="space-y-3">
                <label className="text-sm font-medium text-[var(--text-secondary)]" htmlFor="free-response-input">
                  Your answer:
                </label>
                <input
                  id="free-response-input"
                  type="text"
                  value={currentResponse?.selectedAnswer || ""}
                  onChange={(e) => onFreeResponse(e.target.value)}
                  className="w-full border-2 border-[var(--border)] rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)] transition-all duration-200 bg-[var(--surface-2)] text-[var(--text)]"
                  placeholder="Type your answer here"
                  autoFocus
                  autoComplete="off"
                />
              </div>
            ) : (
              <AnswerChoices
                options={currentQuestion.options}
                selectedAnswer={currentResponse?.selectedAnswer ?? null}
                crossedOut={questionCrossedOut}
                onSelect={onAnswer}
                onToggleCrossOut={(letter) => onToggleCrossOut(currentQuestion.id, letter)}
                showCrossOutButtons={eliminatorActive}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Tools - rendered at root level to avoid clipping */}
      {sectionType === "math" && (
        <>
          <DesmosCalculator visible={showCalculator} onClose={onToggleCalculator} />
          <MathReferenceSheet visible={showReference} onClose={onToggleReference} />
        </>
      )}

      {/* ── Bottom Bar ──────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-t border-[var(--border)] bg-[var(--surface)]">
        <motion.button
          onClick={() => onNav("prev")}
          disabled={isFirst}
          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
            isFirst
              ? "opacity-25 cursor-not-allowed border-[var(--border)] text-[var(--text-tertiary)]"
              : "border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-hover)] hover:bg-[var(--surface-2)] active:scale-[0.97]"
          }`}
          whileTap={!isFirst ? { scale: 0.97 } : undefined}
          aria-label="Previous question"
        >
          ← Back
        </motion.button>

        <QuestionNavigator
          questions={currentModule.questions}
          currentIndex={state.currentQuestionIndex}
          responses={responseMap}
          onGoTo={onGoTo}
          expanded={navExpanded}
          onToggle={onToggleNav}
        />

        {isLast ? (
          <motion.button
            onClick={onSubmitModule}
            className="px-6 py-2 text-sm font-semibold rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-sm shadow-[var(--accent-glow)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Submit module"
          >
            Submit
          </motion.button>
        ) : (
          <motion.button
            onClick={() => onNav("next")}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all duration-200"
            whileTap={{ scale: 0.97 }}
            aria-label="Next question"
          >
            Next →
          </motion.button>
        )}
      </div>
    </div>
  );
});

// ── Ready Screen ────────────────────────────────────────────

function ReadyScreen({ exam, onStart }: { exam: any; onStart: () => void }) {
  const totalMinutes = Math.floor(
    exam.sections.reduce(
      (s: number, sec: any) => s + sec.modules.reduce((ms: number, m: any) => ms + m.timeLimitSeconds, 0),
      0
    ) / 60
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        className="w-full max-w-lg"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Back link */}
        <motion.div variants={staggerItem}>
        <Link
          href="/exams"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors mb-8 sm:mb-10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to exams
        </Link>
        </motion.div>

        {/* Exam info card */}
        <motion.div
          className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden"
          variants={staggerItem}
        >
          {/* Gradient header */}
          <div className="bg-gradient-to-br from-[var(--accent)] to-purple-700 px-7 py-8 text-white">
            <div className="flex items-center gap-2 text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
              {exam.type === "Unknown" ? "Practice Test" : exam.type}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {exam.month} {exam.year}
            </h1>
            <p className="text-white/70 text-sm mt-1">{exam.version}</p>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-6 pt-5 border-t border-white/15">
              <div>
                <p className="text-2xl font-bold tabular-nums">{exam.totalQuestions}</p>
                <p className="text-[11px] text-white/50 uppercase tracking-wider mt-0.5">Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{totalMinutes}<span className="text-base font-normal text-white/50">m</span></p>
                <p className="text-[11px] text-white/50 uppercase tracking-wider mt-0.5">Total Time</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{exam.sections.length}</p>
                <p className="text-[11px] text-white/50 uppercase tracking-wider mt-0.5">Sections</p>
              </div>
            </div>
          </div>

          {/* Structure */}
          <div className="px-7 py-6">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Structure</h2>
            <div className="space-y-3">
              {exam.sections.map((section: any, si: number) => (
                <div key={section.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${si === 0 ? "bg-blue-500" : "bg-emerald-500"}`} />
                    <span className="text-sm font-semibold text-[var(--text)]">{section.name}</span>
                  </div>
                  {section.modules.map((mod: any) => (
                    <div key={mod.id} className="flex justify-between text-sm text-[var(--text-secondary)] ml-4 mb-1">
                      <span>{mod.label} — {mod.questions.length} questions</span>
                      <span className="tabular-nums font-medium">{Math.floor(mod.timeLimitSeconds / 60)} min</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {exam.sections.length > 1 && (
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                10-minute break between sections
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className="px-7 py-5 bg-[var(--surface-2)] border-t border-[var(--border)]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent)]">→</span> Navigate freely within modules
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent)]">→</span> Timer auto-submits at zero
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent)]">→</span> No returning after submission
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent)]">→</span> Progress auto-saved
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent)]">→</span> Desmos calculator for Math
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent)]">→</span> Mark & eliminate answers
              </div>
            </div>
          </div>
        </motion.div>

        {/* Start button */}
        <motion.button
          onClick={onStart}
          className="w-full mt-6 bg-[var(--accent)] text-white py-4 rounded-xl font-semibold text-base hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-lg shadow-[var(--accent-glow)] active:scale-[0.99]"
          variants={staggerItem}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.99 }}
        >
          Begin Exam
        </motion.button>

        <motion.p className="text-center text-[11px] text-[var(--text-tertiary)] mt-4" variants={staggerItem}>
          Keyboard shortcuts: A/B/C/D to answer · Arrow keys to navigate
        </motion.p>
      </motion.div>
    </div>
  );
}

// ── Main Exam Page ──────────────────────────────────────────

export default function ExamPage() {
  const params = useParams();
  const examId = params.id as string;

  const session = useExamSession(examId);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const [navDirection, setNavDirection] = useState(1);
  const [eliminatorActive, setEliminatorActive] = useState(false);

  const {
    exam, state, phase, error, timeRemaining, breakRemaining,
    currentSection, currentModule, currentQuestion, modState, currentResponse,
    responseMap, crossedOut, unansweredCount, markedCount,
    handleStart, handleAnswer, handleFreeResponse, handleFlag,
    handleNav, handleGoToQuestion, handleSubmitModule, handleCancelSubmit,
    handleConfirmSubmit, handleEndBreak, handleToggleCrossOut,
    handleReviewGoToQuestion, handleReviewSubmit,
  } = session;

  const wrappedHandleNav = useCallback((dir: "prev" | "next") => {
    setNavDirection(dir === "next" ? 1 : -1);
    handleNav(dir);
  }, [handleNav]);

  const wrappedHandleGoTo = useCallback((idx: number) => {
    if (state) setNavDirection(idx > state.currentQuestionIndex ? 1 : -1);
    handleGoToQuestion(idx);
  }, [state, handleGoToQuestion]);

  const toggleTimer = useCallback(() => setTimerHidden(v => !v), []);
  const toggleCalculator = useCallback(() => setShowCalculator(v => !v), []);
  const toggleReference = useCallback(() => setShowReference(v => !v), []);
  const toggleNav = useCallback(() => setNavExpanded(v => !v), []);
  const toggleEliminator = useCallback(() => setEliminatorActive(v => !v), []);

  // Error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <a href="/exams" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">← Back to exams</a>
        </motion.div>
      </div>
    );
  }

  // Loading
  if (phase === "loading" || !exam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <LoadingSpinner size={28} />
          <p className="text-sm text-[var(--text-secondary)]">Preparing your exam...</p>
        </motion.div>
      </div>
    );
  }

  // Ready screen
  if (phase === "ready") {
    return <ReadyScreen exam={exam} onStart={handleStart} />;
  }

  // Break
  if (phase === "break") {
    const completedSection = exam.sections[state!.currentSectionIndex - 1]?.name || "Section 1";
    const nextSection = currentSection?.name || "Section 2";
    return (
      <BreakScreen
        timeRemainingMs={breakRemaining}
        completedSection={completedSection}
        nextSection={nextSection}
        onResume={handleEndBreak}
      />
    );
  }

  // Review screen
  if (phase === "review" && state && currentModule && currentSection && modState) {
    const questionStatuses = currentModule.questions.map((q, idx) => {
      const resp = modState.responses.find(r => r.questionId === q.id);
      return { number: idx + 1, answered: !!resp?.selectedAnswer, flagged: resp?.flagged ?? false };
    });
    return (
      <ModuleReviewScreen
        moduleName={`${currentSection.name} — ${currentModule.label}`}
        questions={questionStatuses}
        onGoToQuestion={handleReviewGoToQuestion}
        onSubmit={handleReviewSubmit}
        onCancel={handleCancelSubmit}
      />
    );
  }

  // Confirm submit
  if (phase === "confirm-submit" && state && currentModule && currentSection) {
    return (
      <SubmitConfirmModal
        moduleName={`${currentSection.name} — ${currentModule.label}`}
        unanswered={unansweredCount}
        marked={markedCount}
        onCancel={handleCancelSubmit}
        onConfirm={handleConfirmSubmit}
      />
    );
  }

  // Submitting
  if (phase === "submitting") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <LoadingSpinner size={28} />
          <p className="text-sm text-[var(--text-secondary)]">Submitting your answers...</p>
        </motion.div>
      </div>
    );
  }

  // Main exam
  if (phase === "exam" && state && currentSection && currentModule && currentQuestion && modState) {
    return (
      <ExamContent
        state={state}
        currentSection={currentSection}
        currentModule={currentModule}
        currentQuestion={currentQuestion}
        modState={modState}
        currentResponse={currentResponse}
        timeRemaining={timeRemaining}
        timerHidden={timerHidden}
        onToggleTimer={toggleTimer}
        showCalculator={showCalculator}
        onToggleCalculator={toggleCalculator}
        showReference={showReference}
        onToggleReference={toggleReference}
        navExpanded={navExpanded}
        onToggleNav={toggleNav}
        navDirection={navDirection}
        responseMap={responseMap}
        crossedOut={crossedOut}
        unansweredCount={unansweredCount}
        markedCount={markedCount}
        eliminatorActive={eliminatorActive}
        onToggleEliminator={toggleEliminator}
        onAnswer={handleAnswer}
        onFreeResponse={handleFreeResponse}
        onFlag={handleFlag}
        onNav={wrappedHandleNav}
        onGoTo={wrappedHandleGoTo}
        onSubmitModule={handleSubmitModule}
        onToggleCrossOut={handleToggleCrossOut}
      />
    );
  }

  return null;
}
