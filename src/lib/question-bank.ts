import type {
  QuestionBank,
  QBQuestion,
  PracticeSessionConfig,
  PracticeResponse,
  PracticeSessionResult,
  PracticeQuestionResult,
} from "@/types/question-bank";

const PRACTICE_SESSION_PREFIX = "qb_session_";
const PRACTICE_RESULT_PREFIX = "qb_result_";

// ── Data Loading ──────────────────────────────────────────────

let cachedBank: QuestionBank | null = null;

export async function loadQuestionBank(): Promise<QuestionBank> {
  if (cachedBank) return cachedBank;
  const res = await fetch("/data/question-bank/rw-questions.json");
  cachedBank = await res.json();
  return cachedBank!;
}

// ── Question Selection ────────────────────────────────────────

export function selectQuestions(
  bank: QuestionBank,
  config: PracticeSessionConfig
): QBQuestion[] {
  let pool = [...bank.questions];

  // Filter by domain
  if (config.domain && config.mode !== "all") {
    pool = pool.filter((q) => q.domain === config.domain);
  }

  // Filter by skill
  if (config.skill && config.mode === "skill") {
    pool = pool.filter((q) => q.skill === config.skill);
  }

  // Filter by difficulty
  if (config.difficulty && config.difficulty !== "all") {
    pool = pool.filter((q) => q.difficulty === config.difficulty);
  }

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Take requested count
  return pool.slice(0, config.questionCount);
}

// ── Session Storage ───────────────────────────────────────────

export interface StoredSession {
  config: PracticeSessionConfig;
  questionIds: string[];
  currentIndex: number;
  responses: Record<string, PracticeResponse>;
  startedAt: number;
}

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PRACTICE_SESSION_PREFIX + session.config.id,
    JSON.stringify(session)
  );
}

export function loadSession(sessionId: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(PRACTICE_SESSION_PREFIX + sessionId);
  if (!data) return null;
  return JSON.parse(data);
}

export function deleteSession(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PRACTICE_SESSION_PREFIX + sessionId);
}

// ── Results ───────────────────────────────────────────────────

export function computeResults(
  config: PracticeSessionConfig,
  questions: QBQuestion[],
  responses: Record<string, PracticeResponse>,
  startedAt: number
): PracticeSessionResult {
  const now = Date.now();
  const questionResults: PracticeQuestionResult[] = [];

  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalSkipped = 0;
  let totalAnswered = 0;
  let totalTimeMs = 0;

  for (const q of questions) {
    const resp = responses[q.id];
    const selectedAnswer = resp?.selectedAnswer || null;
    const isCorrect = selectedAnswer === q.correctAnswer;
    const timeMs = resp?.timeSpentMs || 0;

    if (selectedAnswer) {
      totalAnswered++;
      if (isCorrect) totalCorrect++;
      else totalIncorrect++;
    } else {
      totalSkipped++;
    }
    totalTimeMs += timeMs;

    questionResults.push({
      questionId: q.id,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      passage: q.passage,
      question: q.question,
      options: q.options,
      selectedAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      timeSpentMs: timeMs,
      rationale: q.rationale,
    });
  }

  // Domain breakdown
  const domainMap = new Map<string, { total: number; correct: number }>();
  for (const qr of questionResults) {
    const d = domainMap.get(qr.domain) || { total: 0, correct: 0 };
    d.total++;
    if (qr.isCorrect) d.correct++;
    domainMap.set(qr.domain, d);
  }

  // Skill breakdown
  const skillMap = new Map<string, { domain: string; total: number; correct: number }>();
  for (const qr of questionResults) {
    const key = `${qr.domain}::${qr.skill}`;
    const s = skillMap.get(key) || { domain: qr.domain, total: 0, correct: 0 };
    s.total++;
    if (qr.isCorrect) s.correct++;
    skillMap.set(key, s);
  }

  // Difficulty breakdown
  const diffMap = new Map<string, { total: number; correct: number }>();
  for (const qr of questionResults) {
    const d = diffMap.get(qr.difficulty) || { total: 0, correct: 0 };
    d.total++;
    if (qr.isCorrect) d.correct++;
    diffMap.set(qr.difficulty, d);
  }

  const result: PracticeSessionResult = {
    sessionId: config.id,
    config,
    startedAt,
    completedAt: now,
    totalQuestions: questions.length,
    totalAnswered,
    totalCorrect,
    totalIncorrect,
    totalSkipped,
    accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    avgTimePerQuestion: questions.length > 0 ? Math.round(totalTimeMs / questions.length) : 0,
    questions: questionResults,
    domainBreakdown: Array.from(domainMap.entries()).map(([domain, d]) => ({
      domain,
      ...d,
      accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    })),
    skillBreakdown: Array.from(skillMap.entries()).map(([, s]) => ({
      skill: s.domain.split("::")[0] || "",
      ...s,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    })),
    difficultyBreakdown: Array.from(diffMap.entries()).map(([difficulty, d]) => ({
      difficulty,
      ...d,
      accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    })),
  };

  return result;
}

export function savePracticeResult(result: PracticeSessionResult): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PRACTICE_RESULT_PREFIX + result.sessionId,
    JSON.stringify(result)
  );
}

export function loadPracticeResult(
  sessionId: string
): PracticeSessionResult | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(PRACTICE_RESULT_PREFIX + sessionId);
  if (!data) return null;
  return JSON.parse(data);
}

export function getAllPracticeResults(): PracticeSessionResult[] {
  if (typeof window === "undefined") return [];
  const results: PracticeSessionResult[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PRACTICE_RESULT_PREFIX)) {
      const data = localStorage.getItem(key);
      if (data) results.push(JSON.parse(data));
    }
  }
  return results.sort((a, b) => b.completedAt - a.completedAt);
}

// ── Helpers ───────────────────────────────────────────────────

export function generateSessionId(): string {
  return `ps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
