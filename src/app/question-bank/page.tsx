"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { QuestionBank, QBDomainInfo, PracticeSessionConfig } from "@/types/question-bank";
import {
  loadQuestionBank,
  selectQuestions,
  saveSession,
  generateSessionId,
} from "@/lib/question-bank";

// ── Animation Variants ────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

// ── Domain Icons ──────────────────────────────────────────────

function DomainIcon({ domain }: { domain: string }) {
  const icons: Record<string, React.ReactNode> = {
    "Information and Ideas": (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    "Craft and Structure": (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    "Expression of Ideas": (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    "Standard English Conventions": (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  };
  return <span className="text-[#1e3a5f]">{icons[domain] || icons["Information and Ideas"]}</span>;
}

// ── Difficulty Badge ──────────────────────────────────────────

function DifficultyDots({ difficulty }: { difficulty: "Easy" | "Medium" | "Hard" }) {
  const filled = difficulty === "Easy" ? 1 : difficulty === "Medium" ? 2 : 3;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-sm ${
            i <= filled ? "bg-[#1e3a5f]" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ── Session Config Modal ──────────────────────────────────────

function StartSessionModal({
  label,
  availableCount,
  onStart,
  onClose,
}: {
  label: string;
  availableCount: number;
  onStart: (count: number, difficulty: string, timed: boolean) => void;
  onClose: () => void;
}) {
  const [count, setCount] = useState(Math.min(20, availableCount));
  const [difficulty, setDifficulty] = useState("all");
  const [timed, setTimed] = useState(false);

  const presets = [10, 20, 30, 50].filter((n) => n <= availableCount);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-glass-lg w-full max-w-md mx-4 overflow-hidden"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Start Practice Session</h3>
          <p className="text-sm text-gray-500 mt-1">{label}</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Question Count */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Number of Questions
            </label>
            <div className="flex gap-2 flex-wrap">
              {presets.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    count === n
                      ? "bg-[#1e3a5f] text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
              {availableCount > 50 && (
                <button
                  onClick={() => setCount(availableCount)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    count === availableCount
                      ? "bg-[#1e3a5f] text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  All ({availableCount})
                </button>
              )}
            </div>
            <input
              type="range"
              min={1}
              max={availableCount}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full mt-3 accent-[#1e3a5f]"
            />
            <p className="text-xs text-gray-400 mt-1">{count} of {availableCount} questions</p>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {["all", "Easy", "Medium", "Hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    difficulty === d
                      ? "bg-[#1e3a5f] text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {d === "all" ? "All" : d}
                </button>
              ))}
            </div>
          </div>

          {/* Timer Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Timed Mode</p>
              <p className="text-xs text-gray-400">~75 seconds per question</p>
            </div>
            <button
              onClick={() => setTimed(!timed)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                timed ? "bg-[#1e3a5f]" : "bg-gray-300"
              }`}
            >
              <motion.div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                animate={{ left: timed ? 26 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            onClick={() => onStart(count, difficulty, timed)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#1e3a5f] text-white hover:bg-[#2a4f7a] transition-colors shadow-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Practice
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Skill Row ─────────────────────────────────────────────────

function SkillRow({
  name,
  count,
  onStart,
}: {
  name: string;
  count: number;
  onStart: () => void;
}) {
  return (
    <motion.div
      className="flex items-center justify-between px-5 py-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all group"
      variants={fadeUp}
    >
      <span className="text-[15px] text-gray-700 font-medium">{name}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 tabular-nums">{count} questions</span>
        <button
          onClick={onStart}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 hover:border-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-all opacity-0 group-hover:opacity-100"
          title="Start practice"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ── Domain Card ───────────────────────────────────────────────

function DomainCard({
  domain,
  expanded,
  onToggle,
  onStartDomain,
  onStartSkill,
}: {
  domain: QBDomainInfo;
  expanded: boolean;
  onToggle: () => void;
  onStartDomain: () => void;
  onStartSkill: (skill: string) => void;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-gray-150 bg-white overflow-hidden"
      variants={fadeUp}
      layout
    >
      {/* Domain Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/[0.06] flex items-center justify-center">
            <DomainIcon domain={domain.name} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-[15px]">{domain.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{domain.count} questions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
            title={expanded ? "Collapse" : "Expand"}
          >
            <motion.svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </motion.svg>
          </button>
          <button
            onClick={onStartDomain}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 hover:border-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-all"
            title="Practice all in this domain"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Skills List */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }}
            className="overflow-hidden"
          >
            <motion.div
              className="px-4 pb-4 space-y-2"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {domain.skills.map((skill) => (
                <SkillRow
                  key={skill.name}
                  name={skill.name}
                  count={skill.count}
                  onStart={() => onStartSkill(skill.name)}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function QuestionBankPage() {
  const router = useRouter();
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [modalConfig, setModalConfig] = useState<{
    label: string;
    mode: "domain" | "skill" | "all";
    domain?: string;
    skill?: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    loadQuestionBank()
      .then(setBank)
      .finally(() => setLoading(false));
  }, []);

  const toggleDomain = (name: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const openModal = (
    label: string,
    mode: "domain" | "skill" | "all",
    count: number,
    domain?: string,
    skill?: string
  ) => {
    setModalConfig({ label, mode, domain, skill, count });
  };

  const startSession = (count: number, difficulty: string, timed: boolean) => {
    if (!bank || !modalConfig) return;

    const sessionId = generateSessionId();
    const config: PracticeSessionConfig = {
      id: sessionId,
      test: "Reading and Writing",
      mode: modalConfig.mode,
      domain: modalConfig.domain,
      skill: modalConfig.skill,
      questionCount: count,
      difficulty: difficulty as "Easy" | "Medium" | "Hard" | "all",
      timed,
      timePerQuestion: timed ? 75 : 0,
    };

    const questions = selectQuestions(bank, config);
    saveSession({
      config: { ...config, questionCount: questions.length },
      questionIds: questions.map((q) => q.id),
      currentIndex: 0,
      responses: {},
      startedAt: Date.now(),
    });

    router.push(`/practice/session?id=${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading question bank...</p>
        </div>
      </div>
    );
  }

  if (!bank) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </a>
            <h1 className="text-lg font-semibold text-gray-900">Practice from Question Bank</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block tabular-nums">
              {bank.totalQuestions} questions available
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header Section */}
        <motion.div
          className="mb-8"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
            variants={fadeUp}
          >
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reading & Writing</h2>
              <p className="text-sm text-gray-500 mt-1">
                {bank.totalQuestions} questions across {bank.domains.length} domains
              </p>
            </div>
            <motion.button
              onClick={() =>
                openModal(
                  "All Reading & Writing",
                  "all",
                  bank.totalQuestions
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4f7a] transition-colors shadow-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Practice All
            </motion.button>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            variants={stagger}
          >
            {bank.domains.map((d) => (
              <motion.div
                key={d.name}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-gray-200 transition-all cursor-pointer"
                variants={fadeUp}
                whileHover={{ y: -2 }}
                onClick={() => {
                  setExpandedDomains((prev) => {
                    const next = new Set(prev);
                    next.add(d.name);
                    return next;
                  });
                  document.getElementById(`domain-${d.name}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <DomainIcon domain={d.name} />
                  <span className="text-xs font-medium text-gray-500 truncate">{d.name}</span>
                </div>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{d.count}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Domain Cards */}
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {bank.domains.map((domain) => (
            <div key={domain.name} id={`domain-${domain.name}`}>
              <DomainCard
                domain={domain}
                expanded={expandedDomains.has(domain.name)}
                onToggle={() => toggleDomain(domain.name)}
                onStartDomain={() =>
                  openModal(domain.name, "domain", domain.count, domain.name)
                }
                onStartSkill={(skill) => {
                  const skillInfo = domain.skills.find((s) => s.name === skill);
                  openModal(
                    `${domain.name} — ${skill}`,
                    "skill",
                    skillInfo?.count || 0,
                    domain.name,
                    skill
                  );
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Start Session Modal */}
      <AnimatePresence>
        {modalConfig && (
          <StartSessionModal
            label={modalConfig.label}
            availableCount={modalConfig.count}
            onStart={startSession}
            onClose={() => setModalConfig(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
