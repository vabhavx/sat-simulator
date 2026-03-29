import { AttemptState, AttemptResult } from "@/types/exam";

const ATTEMPT_PREFIX = "sat_attempt_";
const RESULT_PREFIX = "sat_result_";

export function saveAttempt(state: AttemptState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    ATTEMPT_PREFIX + state.attemptId,
    JSON.stringify(state)
  );
}

export function loadAttempt(attemptId: string): AttemptState | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(ATTEMPT_PREFIX + attemptId);
  if (!data) return null;
  return JSON.parse(data);
}

export function deleteAttempt(attemptId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ATTEMPT_PREFIX + attemptId);
}

export function getActiveAttemptForExam(
  examId: string
): AttemptState | null {
  if (typeof window === "undefined") return null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(ATTEMPT_PREFIX)) {
      const data = localStorage.getItem(key);
      if (data) {
        const state: AttemptState = JSON.parse(data);
        if (state.examId === examId && !state.submitted) {
          return state;
        }
      }
    }
  }
  return null;
}

export function saveResult(result: AttemptResult): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    RESULT_PREFIX + result.attemptId,
    JSON.stringify(result)
  );
}

export function loadResult(attemptId: string): AttemptResult | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(RESULT_PREFIX + attemptId);
  if (!data) return null;
  return JSON.parse(data);
}

export function getAllResults(): AttemptResult[] {
  if (typeof window === "undefined") return [];
  const results: AttemptResult[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(RESULT_PREFIX)) {
      const data = localStorage.getItem(key);
      if (data) results.push(JSON.parse(data));
    }
  }
  return results.sort((a, b) => b.submittedAt - a.submittedAt);
}
