"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Exam, Section, Module, Question } from "@/types/exam";

interface ModuleTab {
  sectionIndex: number;
  moduleIndex: number;
  label: string;
  section: Section;
  module: Module;
}

export default function AnswerKeyPage() {
  const params = useParams();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [batchMode, setBatchMode] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load exam data, merging in any saved answer keys from localStorage
  useEffect(() => {
    fetch(`/data/exams/${examId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Exam not found");
        return res.json();
      })
      .then((data: Exam) => {
        // Check for saved answers in localStorage
        const saved = localStorage.getItem(`answer_key_${examId}`);
        if (saved) {
          try {
            const savedAnswers: Record<string, string> = JSON.parse(saved);
            // Merge saved answers into exam data
            for (const section of data.sections) {
              for (const mod of section.modules) {
                for (const q of mod.questions) {
                  if (savedAnswers[q.id] !== undefined) {
                    q.correctAnswer = savedAnswers[q.id];
                  }
                }
              }
            }
          } catch {
            // Ignore corrupt localStorage data
          }
        }
        setExam(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [examId]);

  // Build module tabs
  const tabs: ModuleTab[] = useMemo(() => {
    if (!exam) return [];
    const result: ModuleTab[] = [];
    exam.sections.forEach((section, si) => {
      section.modules.forEach((mod, mi) => {
        const prefix = section.name.includes("Math") ? "Math" : "RW";
        result.push({
          sectionIndex: si,
          moduleIndex: mi,
          label: `${prefix} Module ${mod.number}`,
          section,
          module: mod,
        });
      });
    });
    return result;
  }, [exam]);

  const currentTab = tabs[activeTab] || null;
  const currentQuestions = currentTab?.module.questions || [];

  // Count total answers set
  const { totalAnswered, totalQuestions } = useMemo(() => {
    if (!exam) return { totalAnswered: 0, totalQuestions: 0 };
    let answered = 0;
    let total = 0;
    for (const section of exam.sections) {
      for (const mod of section.modules) {
        for (const q of mod.questions) {
          total++;
          if (q.correctAnswer) answered++;
        }
      }
    }
    return { totalAnswered: answered, totalQuestions: total };
  }, [exam]);

  // Set answer for a question
  const setAnswer = useCallback(
    (questionId: string, answer: string) => {
      if (!exam) return;
      setExam((prev) => {
        if (!prev) return prev;
        const updated = structuredClone(prev);
        for (const section of updated.sections) {
          for (const mod of section.modules) {
            for (const q of mod.questions) {
              if (q.id === questionId) {
                q.correctAnswer = answer || undefined;
                return updated;
              }
            }
          }
        }
        return updated;
      });
    },
    [exam]
  );

  // Clear answer for a question
  const clearAnswer = useCallback(
    (questionId: string) => {
      if (!exam) return;
      setExam((prev) => {
        if (!prev) return prev;
        const updated = structuredClone(prev);
        for (const section of updated.sections) {
          for (const mod of section.modules) {
            for (const q of mod.questions) {
              if (q.id === questionId) {
                q.correctAnswer = undefined;
                return updated;
              }
            }
          }
        }
        return updated;
      });
    },
    [exam]
  );

  // Apply batch paste
  const applyBatch = useCallback(() => {
    if (!exam || !currentTab) return;
    const cleaned = batchText.replace(/[\s,.\-_]/g, "").toUpperCase();
    setExam((prev) => {
      if (!prev) return prev;
      const updated = structuredClone(prev);
      const mod =
        updated.sections[currentTab.sectionIndex].modules[
          currentTab.moduleIndex
        ];
      let charIdx = 0;
      for (let i = 0; i < mod.questions.length && charIdx < cleaned.length; i++) {
        const q = mod.questions[i];
        if (q.isFreeResponse) {
          // For free response, consume characters until we hit a letter
          // that could be an MCQ answer for the next question, or end of string.
          // Simple approach: take one "token" — everything up to the next
          // single-letter MCQ answer boundary. For now, just take one character/number.
          // Actually, for batch paste, free response answers are tricky.
          // We'll just assign the next character as the answer.
          q.correctAnswer = cleaned[charIdx];
          charIdx++;
        } else {
          // MCQ: expect A, B, C, or D
          const letter = cleaned[charIdx];
          if (["A", "B", "C", "D"].includes(letter)) {
            q.correctAnswer = letter;
          }
          charIdx++;
        }
      }
      return updated;
    });
    setBatchText("");
    setBatchMode(false);
  }, [exam, currentTab, batchText]);

  // Save to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (!exam) return;
    const answers: Record<string, string> = {};
    for (const section of exam.sections) {
      for (const mod of section.modules) {
        for (const q of mod.questions) {
          if (q.correctAnswer) {
            answers[q.id] = q.correctAnswer;
          }
        }
      }
    }
    localStorage.setItem(`answer_key_${examId}`, JSON.stringify(answers));
    setSaveMessage("Saved to browser storage");
    setTimeout(() => setSaveMessage(null), 3000);
  }, [exam, examId]);

  // Download as JSON
  const downloadJSON = useCallback(() => {
    if (!exam) return;
    const blob = new Blob([JSON.stringify(exam, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${examId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exam, examId]);

  // Truncate text
  const truncate = (text: string, len: number) => {
    if (text.length <= len) return text;
    return text.slice(0, len) + "...";
  };

  // RENDER

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--text-secondary)]">Loading exam...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[var(--incorrect)] mb-4">{error || "Exam not found"}</p>
          <Link href="/admin" className="text-[var(--accent)] hover:underline text-sm">
            Back to exams
          </Link>
        </div>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-10">
        <Link
          href="/admin"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] mb-6 inline-block"
        >
          &larr; Back to exams
        </Link>
        <h1 className="text-2xl font-semibold mb-2">
          {exam.month} {exam.year} &mdash; {exam.version}
        </h1>
        <p className="text-[var(--text-secondary)]">
          This exam has no parsed questions. Run the parser first.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <Link
        href="/admin"
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] mb-6 inline-block"
      >
        &larr; Back to exams
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">
            {exam.month} {exam.year} &mdash; {exam.version}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {exam.type} &middot; {exam.fileName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            <span
              className={
                totalAnswered === totalQuestions
                  ? "text-[var(--correct)]"
                  : "text-[var(--text)]"
              }
            >
              {totalAnswered}
            </span>
            <span className="text-[var(--text-secondary)]">
              {" "}
              of {totalQuestions} answers set
            </span>
          </p>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {tabs.map((tab, idx) => {
          const moduleAnswered = tab.module.questions.filter(
            (q) => q.correctAnswer
          ).length;
          const moduleTotal = tab.module.questions.length;
          const isComplete = moduleAnswered === moduleTotal;
          return (
            <button
              key={`${tab.sectionIndex}-${tab.moduleIndex}`}
              onClick={() => {
                setActiveTab(idx);
                setBatchMode(false);
                setBatchText("");
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === idx
                  ? "border-[var(--text)] text-[var(--text)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--border)]"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 text-xs ${
                  isComplete
                    ? "text-[var(--correct)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {moduleAnswered}/{moduleTotal}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setBatchMode(!batchMode)}
          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
            batchMode
              ? "border-[var(--accent)] text-[var(--accent)] bg-blue-50"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text)]"
          }`}
        >
          {batchMode ? "Cancel Batch" : "Batch Paste"}
        </button>

        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className="text-xs text-[var(--correct)] mr-2">
              {saveMessage}
            </span>
          )}
          <button
            onClick={saveToLocalStorage}
            className="px-4 py-1.5 text-xs rounded bg-[var(--text)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Save
          </button>
          <button
            onClick={downloadJSON}
            className="px-4 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors"
          >
            Download JSON
          </button>
        </div>
      </div>

      {/* Batch Paste Panel */}
      {batchMode && (
        <div className="mb-6 border border-[var(--accent)] rounded-lg p-4 bg-blue-50">
          <p className="text-sm font-medium mb-2">
            Batch Paste &mdash; {currentTab?.label}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Paste answer letters sequentially (e.g., &quot;ABCDABCDCBDA...&quot;).
            One letter per question. Spaces and punctuation are ignored.
          </p>
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder="ABCDABCDCBDA..."
            className="w-full border border-[var(--border)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent)] mb-3 bg-white"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-secondary)]">
              {batchText.replace(/[\s,.\-_]/g, "").length} characters &middot;{" "}
              {currentQuestions.length} questions in module
            </p>
            <button
              onClick={applyBatch}
              disabled={batchText.replace(/[\s,.\-_]/g, "").length === 0}
              className="px-4 py-1.5 text-xs rounded bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Questions Grid */}
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
              <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] w-12">
                #
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">
                Prompt
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] w-16">
                Type
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)] w-64">
                Answer
              </th>
            </tr>
          </thead>
          <tbody>
            {currentQuestions.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                onSetAnswer={setAnswer}
                onClearAnswer={clearAnswer}
                truncate={truncate}
              />
            ))}
          </tbody>
        </table>
      </div>

      {currentQuestions.length === 0 && (
        <p className="text-center text-[var(--text-secondary)] py-12">
          No questions in this module.
        </p>
      )}
    </div>
  );
}

// Separate component for each question row to optimize renders
function QuestionRow({
  question,
  onSetAnswer,
  onClearAnswer,
  truncate,
}: {
  question: Question;
  onSetAnswer: (id: string, answer: string) => void;
  onClearAnswer: (id: string) => void;
  truncate: (text: string, len: number) => string;
}) {
  const q = question;
  const hasAnswer = !!q.correctAnswer;

  return (
    <tr className="border-b border-[var(--border)] last:border-b-0 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">
        {q.number}
      </td>
      <td className="px-4 py-3">
        <span
          className="text-xs text-[var(--text-secondary)] leading-snug"
          title={q.prompt}
        >
          {truncate(q.prompt.replace(/\n/g, " "), 60)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            q.isFreeResponse
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {q.isFreeResponse ? "Free" : "MCQ"}
        </span>
      </td>
      <td className="px-4 py-3">
        {q.isFreeResponse ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={q.correctAnswer || ""}
              onChange={(e) => onSetAnswer(q.id, e.target.value)}
              placeholder="Enter answer"
              className={`w-40 border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${
                hasAnswer
                  ? "border-green-300 bg-green-50 text-green-800 focus:border-green-500"
                  : "border-[var(--border)] focus:border-[var(--accent)]"
              }`}
            />
            {hasAnswer && (
              <button
                onClick={() => onClearAnswer(q.id)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--incorrect)] transition-colors"
                title="Clear answer"
              >
                x
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {(["A", "B", "C", "D"] as const).map((letter) => {
              const isSelected = q.correctAnswer === letter;
              return (
                <button
                  key={letter}
                  onClick={() => {
                    if (isSelected) {
                      onClearAnswer(q.id);
                    } else {
                      onSetAnswer(q.id, letter);
                    }
                  }}
                  className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
            {hasAnswer && (
              <span className="ml-2 text-xs text-[var(--correct)] font-medium">
                {q.correctAnswer}
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
