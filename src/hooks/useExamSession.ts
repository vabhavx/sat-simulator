"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Exam, AttemptState } from "@/types/exam";
import {
  createAttempt,
  getFlatModuleIndexForExam,
  setAnswer,
  toggleFlag,
  updateTimeSpent,
  tickTimer,
  submitModule,
  endBreak,
  startModule,
  computeResults,
} from "@/lib/exam-engine";
import {
  saveAttempt,
  getActiveAttemptForExam,
  deleteAttempt,
  saveResult,
} from "@/lib/storage";

export type ExamPhase =
  | "loading"
  | "ready"
  | "exam"
  | "break"
  | "review"
  | "confirm-submit"
  | "submitting";

export function useExamSession(examId: string) {
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [state, setState] = useState<AttemptState | null>(null);
  const [phase, setPhase] = useState<ExamPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [breakRemaining, setBreakRemaining] = useState(0);
  const [crossedOut, setCrossedOut] = useState<Record<string, Set<string>>>({});

  const lastTickRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;
  const examRef = useRef(exam);
  examRef.current = exam;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Load exam
  useEffect(() => {
    fetch(`/data/exams/${examId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Exam not found");
        return res.json();
      })
      .then((data: Exam) => {
        setExam(data);
        const existing = getActiveAttemptForExam(data.id);
        if (existing) {
          setState(existing);
          if (existing.onBreak) {
            setBreakRemaining(
              Math.max(0, (existing.breakEndTime ?? 0) - Date.now())
            );
            setPhase("break");
          } else {
            const flatIdx = getFlatModuleIndexForExam(
              data,
              existing.currentSectionIndex,
              existing.currentModuleIndex
            );
            const modState = existing.moduleStates[flatIdx];
            if (modState) setTimeRemaining(modState.timeRemainingMs);
            lastTickRef.current = Date.now();
            setPhase("exam");
          }
        } else {
          setPhase("ready");
        }
      })
      .catch((err) => setError(err.message));
  }, [examId]);

  // --- Timer (1 second interval, uses refs to avoid stale closures) ---
  useEffect(() => {
    if (phase !== "exam") return;
    // Reset tick reference when timer effect starts
    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      const currentExam = examRef.current;
      const currentState = stateRef.current;
      if (!currentExam || !currentState) return;

      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      const [updated, remaining, expired] = tickTimer(
        currentState,
        currentExam,
        elapsed
      );

      setTimeRemaining(remaining);

      if (expired) {
        // Auto-submit on time expiry
        const submitted = submitModule(updated, currentExam);
        saveAttempt(submitted);

        if (submitted.submitted) {
          const result = computeResults(currentExam, submitted);
          saveResult(result);
          deleteAttempt(submitted.attemptId);
          setState(submitted);
          router.push(`/results/${submitted.attemptId}`);
          return;
        }

        if (submitted.onBreak) {
          setState(submitted);
          setBreakRemaining(
            Math.max(0, (submitted.breakEndTime ?? 0) - Date.now())
          );
          setPhase("break");
          return;
        }

        // Next module in same section
        const started = startModule(submitted);
        const fi = getFlatModuleIndexForExam(
          currentExam,
          started.currentSectionIndex,
          started.currentModuleIndex
        );
        setTimeRemaining(started.moduleStates[fi].timeRemainingMs);
        lastTickRef.current = Date.now();
        setState(started);
        saveAttempt(started);
      } else {
        setState(updated);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, router]);

  // --- Break timer (1 second interval) ---
  useEffect(() => {
    if (phase !== "break") return;

    const interval = setInterval(() => {
      const currentState = stateRef.current;
      if (!currentState?.breakEndTime) return;

      const remaining = Math.max(0, currentState.breakEndTime - Date.now());
      setBreakRemaining(remaining);

      if (remaining <= 0) {
        // Auto-end break
        const currentExam = examRef.current;
        if (!currentExam) return;
        const updated = endBreak(currentState);
        const started = startModule(updated);
        const fi = getFlatModuleIndexForExam(
          currentExam,
          started.currentSectionIndex,
          started.currentModuleIndex
        );
        setTimeRemaining(started.moduleStates[fi].timeRemainingMs);
        lastTickRef.current = Date.now();
        setState(started);
        saveAttempt(started);
        setPhase("exam");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Question time tracking reset
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [
    state?.currentQuestionIndex,
    state?.currentModuleIndex,
    state?.currentSectionIndex,
  ]);

  // Auto-save every 5 seconds
  useEffect(() => {
    if (phase !== "exam") return;
    const interval = setInterval(() => {
      if (stateRef.current) saveAttempt(stateRef.current);
    }, 5000);
    return () => clearInterval(interval);
  }, [phase]);

  // Prevent navigation
  useEffect(() => {
    if (phase !== "exam" && phase !== "break") return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // --- Derived state ---
  const currentSection = exam?.sections[state?.currentSectionIndex ?? 0];
  const currentModule =
    currentSection?.modules[state?.currentModuleIndex ?? 0];
  const currentQuestion =
    currentModule?.questions[state?.currentQuestionIndex ?? 0];

  const flatIdx = useMemo(
    () =>
      exam && state
        ? getFlatModuleIndexForExam(
            exam,
            state.currentSectionIndex,
            state.currentModuleIndex
          )
        : 0,
    [exam, state?.currentSectionIndex, state?.currentModuleIndex]
  );

  const modState = state?.moduleStates[flatIdx];
  const currentResponse = modState?.responses.find(
    (r) => r.questionId === currentQuestion?.id
  );

  // --- Actions ---

  const handleStart = useCallback(() => {
    if (!exam) return;
    let attempt = getActiveAttemptForExam(exam.id);
    if (!attempt) attempt = createAttempt(exam);
    const started = startModule(attempt);
    lastTickRef.current = Date.now();
    const fi = getFlatModuleIndexForExam(
      exam,
      started.currentSectionIndex,
      started.currentModuleIndex
    );
    setTimeRemaining(started.moduleStates[fi].timeRemainingMs);
    setState(started);
    saveAttempt(started);
    setPhase("exam");
    try {
      document.documentElement.requestFullscreen?.();
    } catch {}
    document.body.classList.add("exam-mode");
  }, [exam]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!state || !exam || !currentQuestion) return;
      const timeOnQ = Date.now() - questionStartRef.current;
      questionStartRef.current = Date.now();
      let updated = updateTimeSpent(state, currentQuestion.id, timeOnQ);
      const resp = updated.moduleStates[flatIdx]?.responses.find(
        (r) => r.questionId === currentQuestion.id
      );
      const newAnswer = resp?.selectedAnswer === answer ? null : answer;
      updated = setAnswer(updated, currentQuestion.id, newAnswer);
      if (newAnswer) {
        setCrossedOut((prev) => {
          const qSet = new Set(prev[currentQuestion.id] || []);
          qSet.delete(newAnswer);
          return { ...prev, [currentQuestion.id]: qSet };
        });
      }
      setState(updated);
    },
    [state, exam, currentQuestion, flatIdx]
  );

  const handleFreeResponse = useCallback(
    (value: string) => {
      if (!state || !currentQuestion) return;
      setState(setAnswer(state, currentQuestion.id, value || null));
    },
    [state, currentQuestion]
  );

  const handleFlag = useCallback(() => {
    if (!state || !currentQuestion) return;
    setState(toggleFlag(state, currentQuestion.id));
  }, [state, currentQuestion]);

  const handleNav = useCallback(
    (direction: "prev" | "next") => {
      if (!state || !currentModule || !currentQuestion) return;
      const timeOnQ = Date.now() - questionStartRef.current;
      questionStartRef.current = Date.now();
      const updated = updateTimeSpent(state, currentQuestion.id, timeOnQ);
      const newIdx =
        direction === "next"
          ? Math.min(
              state.currentQuestionIndex + 1,
              currentModule.questions.length - 1
            )
          : Math.max(state.currentQuestionIndex - 1, 0);
      setState({ ...updated, currentQuestionIndex: newIdx });
    },
    [state, currentModule, currentQuestion]
  );

  const handleGoToQuestion = useCallback(
    (idx: number) => {
      if (!state || !currentQuestion) return;
      const timeOnQ = Date.now() - questionStartRef.current;
      questionStartRef.current = Date.now();
      const updated = updateTimeSpent(state, currentQuestion.id, timeOnQ);
      setState({ ...updated, currentQuestionIndex: idx });
    },
    [state, currentQuestion]
  );

  const handleSubmitModule = useCallback(
    () => setPhase("review"),
    []
  );
  const handleCancelSubmit = useCallback(() => setPhase("exam"), []);

  const handleReviewGoToQuestion = useCallback(
    (idx: number) => {
      if (!state) return;
      setState({ ...state, currentQuestionIndex: idx });
      setPhase("exam");
    },
    [state]
  );

  const handleReviewSubmit = useCallback(
    () => setPhase("confirm-submit"),
    []
  );

  const handleConfirmSubmit = useCallback(() => {
    if (!state || !exam) return;
    setPhase("submitting");

    // Record time on current question
    let updated = state;
    if (currentQuestion) {
      const timeOnQ = Date.now() - questionStartRef.current;
      updated = updateTimeSpent(updated, currentQuestion.id, timeOnQ);
    }

    updated = submitModule(updated, exam);
    saveAttempt(updated);

    if (updated.submitted) {
      const result = computeResults(exam, updated);
      saveResult(result);
      deleteAttempt(updated.attemptId);
      document.body.classList.remove("exam-mode");
      try {
        document.exitFullscreen?.();
      } catch {}
      router.push(`/results/${updated.attemptId}`);
      return;
    }

    if (updated.onBreak) {
      setState(updated);
      setBreakRemaining(
        Math.max(0, (updated.breakEndTime ?? 0) - Date.now())
      );
      setPhase("break");
      return;
    }

    // Next module in same section
    const started = startModule(updated);
    lastTickRef.current = Date.now();
    const fi = getFlatModuleIndexForExam(
      exam,
      started.currentSectionIndex,
      started.currentModuleIndex
    );
    setTimeRemaining(started.moduleStates[fi].timeRemainingMs);
    setState(started);
    saveAttempt(started);
    setPhase("exam");
  }, [state, exam, currentQuestion, router]);

  const handleEndBreak = useCallback(() => {
    if (!state || !exam) return;
    const updated = endBreak(state);
    const started = startModule(updated);
    lastTickRef.current = Date.now();
    const fi = getFlatModuleIndexForExam(
      exam,
      started.currentSectionIndex,
      started.currentModuleIndex
    );
    setTimeRemaining(started.moduleStates[fi].timeRemainingMs);
    setState(started);
    saveAttempt(started);
    setPhase("exam");
  }, [state, exam]);

  const handleToggleCrossOut = useCallback(
    (questionId: string, letter: string) => {
      setCrossedOut((prev) => {
        const qSet = new Set(prev[questionId] || []);
        if (qSet.has(letter)) qSet.delete(letter);
        else qSet.add(letter);
        return { ...prev, [questionId]: qSet };
      });
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "exam") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handleNav("next");
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handleNav("prev");
      } else if (["a", "b", "c", "d"].includes(e.key.toLowerCase())) {
        handleAnswer(e.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleNav, handleAnswer]);

  // Response map for navigator (memoized)
  const responseMap = useMemo(() => {
    const map = new Map<string, { answered: boolean; flagged: boolean }>();
    if (modState) {
      for (const r of modState.responses) {
        map.set(r.questionId, {
          answered: !!r.selectedAnswer,
          flagged: r.flagged,
        });
      }
    }
    return map;
  }, [modState]);

  const unansweredCount =
    modState?.responses.filter((r) => !r.selectedAnswer).length ?? 0;
  const markedCount =
    modState?.responses.filter((r) => r.flagged).length ?? 0;

  return {
    exam,
    state,
    phase,
    error,
    timeRemaining,
    breakRemaining,
    currentSection,
    currentModule,
    currentQuestion,
    modState,
    currentResponse,
    responseMap,
    crossedOut,
    unansweredCount,
    markedCount,
    handleStart,
    handleAnswer,
    handleFreeResponse,
    handleFlag,
    handleNav,
    handleGoToQuestion,
    handleSubmitModule,
    handleCancelSubmit,
    handleConfirmSubmit,
    handleEndBreak,
    handleToggleCrossOut,
    handleReviewGoToQuestion,
    handleReviewSubmit,
  };
}
