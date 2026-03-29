// Student Analytics Engine
// Computes performance trends, domain accuracy, and improvement tracking

import { AttemptResult, QuestionResult } from "@/types/exam";
import { predictFullScore, PredictedScore } from "./scoring-engine";
import { SAT_DOMAINS } from "./domain-classifier";

export interface ScoreHistoryEntry {
  attemptId: string;
  examLabel: string;
  date: number;
  rwRaw: number;
  mathRaw: number;
  predicted: PredictedScore;
}

export interface DomainAccuracy {
  domain: string;
  correct: number;
  total: number;
  pct: number;
}

export interface TimeAnalysis {
  avgTimePerQuestionMs: number;
  avgTimeRW: number;
  avgTimeMath: number;
  slowestDomain: string;
  fastestDomain: string;
}

export interface StudentAnalytics {
  totalAttempts: number;
  scoreHistory: ScoreHistoryEntry[];
  latestScore: PredictedScore | null;
  domainAccuracy: DomainAccuracy[];
  timeAnalysis: TimeAnalysis;
  strengths: string[];
  weaknesses: string[];
  improvementTrend: "improving" | "stable" | "declining";
}

export function computeStudentAnalytics(
  results: AttemptResult[]
): StudentAnalytics {
  if (results.length === 0) {
    return {
      totalAttempts: 0,
      scoreHistory: [],
      latestScore: null,
      domainAccuracy: [],
      timeAnalysis: {
        avgTimePerQuestionMs: 0,
        avgTimeRW: 0,
        avgTimeMath: 0,
        slowestDomain: "",
        fastestDomain: "",
      },
      strengths: [],
      weaknesses: [],
      improvementTrend: "stable",
    };
  }

  // Sort by date ascending
  const sorted = [...results].sort((a, b) => a.submittedAt - b.submittedAt);

  // Score history
  const scoreHistory: ScoreHistoryEntry[] = sorted.map((r) => {
    const rwRaw = r.sections.find((s) => s.sectionName === "Reading and Writing")?.correct ?? 0;
    const mathRaw = r.sections.find((s) => s.sectionName === "Math")?.correct ?? 0;
    const predicted = predictFullScore(rwRaw, mathRaw);

    return {
      attemptId: r.attemptId,
      examLabel: r.examLabel,
      date: r.submittedAt,
      rwRaw,
      mathRaw,
      predicted,
    };
  });

  const latestScore = scoreHistory.length > 0
    ? scoreHistory[scoreHistory.length - 1].predicted
    : null;

  // Domain accuracy across all attempts
  const domainStats = new Map<string, { correct: number; total: number; totalTimeMs: number }>();

  for (const r of results) {
    for (const q of r.questions) {
      if (q.isCorrect === null) continue;
      const domain = getDomainFromQuestion(q);
      const stats = domainStats.get(domain) || { correct: 0, total: 0, totalTimeMs: 0 };
      stats.total++;
      stats.totalTimeMs += q.timeSpentMs;
      if (q.isCorrect) stats.correct++;
      domainStats.set(domain, stats);
    }
  }

  const domainAccuracy: DomainAccuracy[] = [];
  for (const [domain, stats] of domainStats) {
    domainAccuracy.push({
      domain,
      correct: stats.correct,
      total: stats.total,
      pct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    });
  }
  domainAccuracy.sort((a, b) => b.pct - a.pct);

  // Strengths and weaknesses
  const strengths = domainAccuracy
    .filter((d) => d.total >= 3)
    .slice(0, 3)
    .map((d) => d.domain);

  const weaknesses = domainAccuracy
    .filter((d) => d.total >= 3)
    .slice(-3)
    .reverse()
    .map((d) => d.domain);

  // Time analysis
  const allQuestions = results.flatMap((r) => r.questions);
  const rwQuestions = allQuestions.filter((q) => q.section === "Reading and Writing");
  const mathQuestions = allQuestions.filter((q) => q.section === "Math");

  const avgTimeMs = allQuestions.length > 0
    ? Math.round(allQuestions.reduce((s, q) => s + q.timeSpentMs, 0) / allQuestions.length)
    : 0;
  const avgTimeRW = rwQuestions.length > 0
    ? Math.round(rwQuestions.reduce((s, q) => s + q.timeSpentMs, 0) / rwQuestions.length)
    : 0;
  const avgTimeMath = mathQuestions.length > 0
    ? Math.round(mathQuestions.reduce((s, q) => s + q.timeSpentMs, 0) / mathQuestions.length)
    : 0;

  // Domain with slowest/fastest avg time
  const domainTimes = new Map<string, { totalMs: number; count: number }>();
  for (const q of allQuestions) {
    const domain = getDomainFromQuestion(q);
    const stats = domainTimes.get(domain) || { totalMs: 0, count: 0 };
    stats.totalMs += q.timeSpentMs;
    stats.count++;
    domainTimes.set(domain, stats);
  }

  let slowestDomain = "";
  let fastestDomain = "";
  let maxAvg = 0;
  let minAvg = Infinity;

  for (const [domain, stats] of domainTimes) {
    const avg = stats.totalMs / stats.count;
    if (avg > maxAvg) { maxAvg = avg; slowestDomain = domain; }
    if (avg < minAvg) { minAvg = avg; fastestDomain = domain; }
  }

  // Improvement trend
  let improvementTrend: "improving" | "stable" | "declining" = "stable";
  if (scoreHistory.length >= 2) {
    const recent = scoreHistory.slice(-3);
    const first = recent[0].predicted.total.midpoint;
    const last = recent[recent.length - 1].predicted.total.midpoint;
    const diff = last - first;
    if (diff > 20) improvementTrend = "improving";
    else if (diff < -20) improvementTrend = "declining";
  }

  return {
    totalAttempts: results.length,
    scoreHistory,
    latestScore,
    domainAccuracy,
    timeAnalysis: {
      avgTimePerQuestionMs: avgTimeMs,
      avgTimeRW: avgTimeRW,
      avgTimeMath: avgTimeMath,
      slowestDomain,
      fastestDomain,
    },
    strengths,
    weaknesses,
    improvementTrend,
  };
}

// Extract domain from question result (uses prompt-based heuristic if no domain tag)
function getDomainFromQuestion(q: QuestionResult): string {
  // For now, classify by section + simple heuristics
  if (q.section === "Reading and Writing") {
    if (/conforms to the conventions/i.test(q.prompt)) return "Standard English Conventions";
    if (/most logical transition/i.test(q.prompt)) return "Expression of Ideas";
    if (/student wants to/i.test(q.prompt)) return "Expression of Ideas";
    if (/most logical and precise word/i.test(q.prompt) || /most nearly mean/i.test(q.prompt)) return "Craft and Structure";
    if (/main idea|main topic|central claim/i.test(q.prompt)) return "Information and Ideas";
    if (/function of the underlined|overall structure/i.test(q.prompt)) return "Craft and Structure";
    return "Information and Ideas";
  }
  // Math
  if (/area|perimeter|volume|triangle|rectangle|circle|angle|parallel|congruent|similar/i.test(q.prompt)) return "Geometry and Trigonometry";
  if (/quadratic|polynomial|exponential|x\^2|vertex|factor/i.test(q.prompt)) return "Advanced Math";
  if (/ratio|percent|mean|median|data|survey|probability|scatterplot|table|sample/i.test(q.prompt)) return "Problem-Solving and Data Analysis";
  return "Algebra";
}
