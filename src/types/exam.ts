// Core exam data model

export interface AnswerOption {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

export interface Question {
  id: string; // e.g. "s1-m1-q1"
  number: number;
  prompt: string;
  options: AnswerOption[];
  correctAnswer?: string; // Letter or free-response value
  isFreeResponse: boolean;
  confidenceFlag: "high" | "medium" | "low";
  flagReason?: string;
}

export interface Module {
  id: string; // e.g. "s1-m1"
  number: number;
  label: string; // e.g. "Module 1"
  timeLimitSeconds: number;
  questions: Question[];
  difficulty?: string;
}

export interface Section {
  id: string; // e.g. "s1"
  number: number;
  name: string; // "Reading and Writing" or "Math"
  modules: Module[];
}

export interface Exam {
  id: string;
  fileName: string;
  year: number;
  month: string;
  version: string;
  type: "International" | "US" | "Unknown";
  sections: Section[];
  totalQuestions: number;
  hasAnswerKey: boolean;
  parsedAt: string;
}

// Exam catalog entry (lightweight, for listing)
export interface ExamEntry {
  id: string;
  fileName: string;
  year: number;
  month: string;
  version: string;
  type: "International" | "US" | "Unknown";
  totalQuestions: number;
  hasAnswerKey: boolean;
}

// Attempt and response tracking

export interface QuestionResponse {
  questionId: string;
  selectedAnswer: string | null;
  timeSpentMs: number;
  flagged: boolean;
}

export interface ModuleState {
  moduleId: string;
  startedAt: number | null;
  endedAt: number | null;
  timeRemainingMs: number;
  responses: QuestionResponse[];
  submitted: boolean;
}

export interface AttemptState {
  attemptId: string;
  examId: string;
  startedAt: number;
  currentSectionIndex: number;
  currentModuleIndex: number;
  currentQuestionIndex: number;
  moduleStates: ModuleState[];
  submitted: boolean;
  submittedAt: number | null;
  onBreak: boolean;
  breakEndTime: number | null;
}

// Results

export interface QuestionResult {
  questionId: string;
  questionNumber: number;
  section: string;
  module: string;
  prompt: string;
  options: AnswerOption[];
  selectedAnswer: string | null;
  correctAnswer: string | undefined;
  isCorrect: boolean | null; // null if no answer key
  timeSpentMs: number;
  confidenceFlag: "high" | "medium" | "low";
  isFreeResponse: boolean;
}

export interface ModuleResult {
  moduleId: string;
  label: string;
  section: string;
  totalQuestions: number;
  answered: number;
  correct: number | null;
  timeSpentMs: number;
}

export interface SectionResult {
  sectionName: string;
  totalQuestions: number;
  answered: number;
  correct: number | null;
  modules: ModuleResult[];
}

export interface AttemptResult {
  attemptId: string;
  examId: string;
  examLabel: string;
  startedAt: number;
  submittedAt: number;
  totalQuestions: number;
  totalAnswered: number;
  totalCorrect: number | null;
  hasAnswerKey: boolean;
  sections: SectionResult[];
  questions: QuestionResult[];
}

// Digital SAT timing constants
export const SAT_TIMING = {
  RW_MODULE_SECONDS: 32 * 60, // 32 minutes
  MATH_MODULE_SECONDS: 35 * 60, // 35 minutes
  BREAK_SECONDS: 10 * 60, // 10-minute break between sections
} as const;
