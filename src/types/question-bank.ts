// Question Bank types for practice sessions

export interface QBOption {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

export interface QBQuestion {
  id: string;
  domain: string;
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  passage: string;
  question: string;
  options: QBOption[];
  correctAnswer: string;
  rationale: string;
}

export interface QBSkillInfo {
  name: string;
  count: number;
}

export interface QBDomainInfo {
  name: string;
  skills: QBSkillInfo[];
  count: number;
}

export interface QuestionBank {
  test: string;
  totalQuestions: number;
  domains: QBDomainInfo[];
  questions: QBQuestion[];
  parsedAt: string;
}

// Practice session types

export interface PracticeSessionConfig {
  id: string;
  test: "Reading and Writing" | "Math";
  mode: "domain" | "skill" | "all" | "custom";
  domain?: string;
  skill?: string;
  questionCount: number;
  difficulty?: "Easy" | "Medium" | "Hard" | "all";
  timed: boolean;
  timePerQuestion: number; // seconds, 0 = untimed
}

export interface PracticeResponse {
  questionId: string;
  selectedAnswer: string | null;
  timeSpentMs: number;
  flagged: boolean;
}

export interface PracticeSessionState {
  config: PracticeSessionConfig;
  questionIds: string[];
  currentIndex: number;
  responses: Map<string, PracticeResponse>;
  startedAt: number;
  completedAt: number | null;
}

export interface PracticeQuestionResult {
  questionId: string;
  domain: string;
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  passage: string;
  question: string;
  options: QBOption[];
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  rationale: string;
}

export interface PracticeSessionResult {
  sessionId: string;
  config: PracticeSessionConfig;
  startedAt: number;
  completedAt: number;
  totalQuestions: number;
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  accuracy: number; // percentage
  avgTimePerQuestion: number; // ms
  questions: PracticeQuestionResult[];
  domainBreakdown: {
    domain: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
  skillBreakdown: {
    skill: string;
    domain: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
  difficultyBreakdown: {
    difficulty: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
}
