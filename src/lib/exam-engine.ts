import {
  Exam,
  AttemptState,
  ModuleState,
  QuestionResponse,
  AttemptResult,
  QuestionResult,
  ModuleResult,
  SectionResult,
  SAT_TIMING,
} from "@/types/exam";

// --- Immutable helpers ---

function cloneModuleStates(states: ModuleState[]): ModuleState[] {
  return states.map((ms) => ({
    ...ms,
    responses: ms.responses.map((r) => ({ ...r })),
  }));
}

function cloneState(state: AttemptState): AttemptState {
  return {
    ...state,
    moduleStates: cloneModuleStates(state.moduleStates),
  };
}

// --- Attempt creation ---

export function createAttempt(exam: Exam): AttemptState {
  const attemptId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const moduleStates: ModuleState[] = [];
  for (const section of exam.sections) {
    for (const mod of section.modules) {
      const responses: QuestionResponse[] = mod.questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: null,
        timeSpentMs: 0,
        flagged: false,
      }));

      moduleStates.push({
        moduleId: mod.id,
        startedAt: null,
        endedAt: null,
        timeRemainingMs: mod.timeLimitSeconds * 1000,
        responses,
        submitted: false,
      });
    }
  }

  return {
    attemptId,
    examId: exam.id,
    startedAt: Date.now(),
    currentSectionIndex: 0,
    currentModuleIndex: 0,
    currentQuestionIndex: 0,
    moduleStates,
    submitted: false,
    submittedAt: null,
    onBreak: false,
    breakEndTime: null,
  };
}

// --- Index helpers ---

export function getFlatModuleIndex(state: AttemptState): number {
  // For standard SAT: [s1m1, s1m2, s2m1, s2m2] = indices [0, 1, 2, 3]
  // Assumes 2 modules per section
  const idx = state.currentSectionIndex * 2 + state.currentModuleIndex;
  return Math.min(idx, state.moduleStates.length - 1);
}

export function getFlatModuleIndexForExam(
  exam: Exam,
  sectionIndex: number,
  moduleIndex: number
): number {
  let idx = 0;
  for (let si = 0; si < sectionIndex; si++) {
    idx += exam.sections[si]?.modules.length || 0;
  }
  return idx + moduleIndex;
}

// --- State transitions (all return NEW objects) ---

export function startModule(state: AttemptState): AttemptState {
  const next = cloneState(state);
  const flatIdx = getFlatModuleIndex(next);
  const modState = next.moduleStates[flatIdx];
  if (modState && !modState.startedAt) {
    modState.startedAt = Date.now();
  }
  return next;
}

export function setAnswer(
  state: AttemptState,
  questionId: string,
  answer: string | null
): AttemptState {
  const next = cloneState(state);
  const flatIdx = getFlatModuleIndex(next);
  const modState = next.moduleStates[flatIdx];
  if (!modState) return next;

  const response = modState.responses.find((r) => r.questionId === questionId);
  if (response) {
    response.selectedAnswer = answer;
  }
  return next;
}

export function toggleFlag(
  state: AttemptState,
  questionId: string
): AttemptState {
  const next = cloneState(state);
  const flatIdx = getFlatModuleIndex(next);
  const modState = next.moduleStates[flatIdx];
  if (!modState) return next;

  const response = modState.responses.find((r) => r.questionId === questionId);
  if (response) {
    response.flagged = !response.flagged;
  }
  return next;
}

export function updateTimeSpent(
  state: AttemptState,
  questionId: string,
  additionalMs: number
): AttemptState {
  const next = cloneState(state);
  const flatIdx = getFlatModuleIndex(next);
  const modState = next.moduleStates[flatIdx];
  if (!modState) return next;

  const response = modState.responses.find((r) => r.questionId === questionId);
  if (response) {
    response.timeSpentMs += additionalMs;
  }
  return next;
}

/**
 * Tick the timer for the current module by `elapsedMs`.
 * Returns [newState, newTimeRemainingMs, expired].
 */
export function tickTimer(
  state: AttemptState,
  exam: Exam,
  elapsedMs: number
): [AttemptState, number, boolean] {
  const next = cloneState(state);
  const flatIdx = getFlatModuleIndexForExam(
    exam,
    next.currentSectionIndex,
    next.currentModuleIndex
  );
  const modState = next.moduleStates[flatIdx];
  if (!modState || modState.submitted) {
    return [next, modState?.timeRemainingMs ?? 0, false];
  }

  const newRemaining = Math.max(0, modState.timeRemainingMs - elapsedMs);
  modState.timeRemainingMs = newRemaining;

  return [next, newRemaining, newRemaining <= 0];
}

export function submitModule(
  state: AttemptState,
  exam: Exam
): AttemptState {
  const next = cloneState(state);
  const flatIdx = getFlatModuleIndex(next);
  const modState = next.moduleStates[flatIdx];
  if (modState) {
    modState.submitted = true;
    modState.endedAt = Date.now();
  }

  // Check if there are more modules
  const currentSection = exam.sections[next.currentSectionIndex];
  if (!currentSection) {
    return { ...next, submitted: true, submittedAt: Date.now() };
  }

  if (next.currentModuleIndex + 1 < currentSection.modules.length) {
    // Next module in same section
    return {
      ...next,
      currentModuleIndex: next.currentModuleIndex + 1,
      currentQuestionIndex: 0,
    };
  }

  // Check next section
  if (next.currentSectionIndex + 1 < exam.sections.length) {
    // Break between sections
    return {
      ...next,
      currentSectionIndex: next.currentSectionIndex + 1,
      currentModuleIndex: 0,
      currentQuestionIndex: 0,
      onBreak: true,
      breakEndTime: Date.now() + SAT_TIMING.BREAK_SECONDS * 1000,
    };
  }

  // All sections done
  return { ...next, submitted: true, submittedAt: Date.now() };
}

export function endBreak(state: AttemptState): AttemptState {
  return { ...cloneState(state), onBreak: false, breakEndTime: null };
}

// --- Results computation ---

export function computeResults(
  exam: Exam,
  state: AttemptState
): AttemptResult {
  const questions: QuestionResult[] = [];
  const sectionResults: SectionResult[] = [];

  let globalModuleIdx = 0;

  for (const section of exam.sections) {
    const moduleResults: ModuleResult[] = [];

    for (const mod of section.modules) {
      const modState = state.moduleStates[globalModuleIdx];
      let moduleCorrect = 0;
      let moduleAnswered = 0;
      let moduleTotalTime = 0;
      let hasAnyKey = false;

      for (const q of mod.questions) {
        const response = modState?.responses.find(
          (r) => r.questionId === q.id
        );
        const selectedAnswer = response?.selectedAnswer || null;
        const timeSpent = response?.timeSpentMs || 0;

        let isCorrect: boolean | null = null;
        if (q.correctAnswer) {
          hasAnyKey = true;
          if (selectedAnswer) {
            isCorrect =
              selectedAnswer.toUpperCase() === q.correctAnswer.toUpperCase();
            if (isCorrect) moduleCorrect++;
          }
        }

        if (selectedAnswer) moduleAnswered++;
        moduleTotalTime += timeSpent;

        questions.push({
          questionId: q.id,
          questionNumber: q.number,
          section: section.name,
          module: mod.label,
          prompt: q.prompt,
          options: q.options,
          selectedAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect,
          timeSpentMs: timeSpent,
          confidenceFlag: q.confidenceFlag,
          isFreeResponse: q.isFreeResponse,
        });
      }

      moduleResults.push({
        moduleId: mod.id,
        label: mod.label,
        section: section.name,
        totalQuestions: mod.questions.length,
        answered: moduleAnswered,
        correct: hasAnyKey ? moduleCorrect : null,
        timeSpentMs: moduleTotalTime,
      });

      globalModuleIdx++;
    }

    const sectionAnswered = moduleResults.reduce(
      (s, m) => s + m.answered,
      0
    );
    const sectionCorrect = moduleResults.every((m) => m.correct !== null)
      ? moduleResults.reduce((s, m) => s + (m.correct || 0), 0)
      : null;

    sectionResults.push({
      sectionName: section.name,
      totalQuestions: moduleResults.reduce((s, m) => s + m.totalQuestions, 0),
      answered: sectionAnswered,
      correct: sectionCorrect,
      modules: moduleResults,
    });
  }

  const totalAnswered = questions.filter((q) => q.selectedAnswer).length;
  const totalCorrect = exam.hasAnswerKey
    ? questions.filter((q) => q.isCorrect === true).length
    : null;

  return {
    attemptId: state.attemptId,
    examId: exam.id,
    examLabel: `${exam.month} ${exam.year} — ${exam.version}`,
    startedAt: state.startedAt,
    submittedAt: state.submittedAt || Date.now(),
    totalQuestions: exam.totalQuestions,
    totalAnswered,
    totalCorrect,
    hasAnswerKey: exam.hasAnswerKey,
    sections: sectionResults,
    questions,
  };
}
