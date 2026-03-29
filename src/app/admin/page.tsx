"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExamEntry } from "@/types/exam";

export default function AdminExamsPage() {
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/catalog.json")
      .then((res) => {
        if (!res.ok) throw new Error("Catalog not found. Run: npm run parse");
        return res.json();
      })
      .then((data: ExamEntry[]) => {
        // Sort by year desc, then month
        const sorted = [...data].sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return a.month.localeCompare(b.month);
        });
        setExams(sorted);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Check localStorage for answer keys
  const hasLocalAnswerKey = (id: string): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`answer_key_${id}`) !== null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--text-secondary)]">Loading exams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--incorrect)]">{error}</p>
      </div>
    );
  }

  const withQuestions = exams.filter((e) => e.totalQuestions > 0).length;
  const withAnswerKeys = exams.filter(
    (e) => e.hasAnswerKey || hasLocalAnswerKey(e.id)
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Exam Management</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {exams.length} exams total &middot; {withQuestions} with parsed
          questions &middot; {withAnswerKeys} with answer keys
        </p>
      </div>

      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">
                Exam
              </th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">
                Type
              </th>
              <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">
                Questions
              </th>
              <th className="text-center px-4 py-3 font-medium text-[var(--text-secondary)]">
                Answer Key
              </th>
              <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const hasKey = exam.hasAnswerKey || hasLocalAnswerKey(exam.id);
              return (
                <tr
                  key={exam.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {exam.month} {exam.year}
                    </span>
                    <span className="text-[var(--text-secondary)] ml-2">
                      {exam.version}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {exam.type}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {exam.totalQuestions === 0 ? (
                      <span className="text-[var(--text-secondary)]">--</span>
                    ) : (
                      exam.totalQuestions
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasKey ? (
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">
                        {exam.hasAnswerKey ? "Built-in" : "Local"}
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {exam.totalQuestions > 0 ? (
                      <Link
                        href={`/admin/exams/${exam.id}/answer-key`}
                        className="text-[var(--accent)] hover:underline text-xs font-medium"
                      >
                        Edit Answer Key
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--text-secondary)]">
                        No questions
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
