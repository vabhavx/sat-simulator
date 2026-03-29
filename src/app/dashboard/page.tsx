"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllResults } from "@/lib/storage";
import { computeStudentAnalytics, StudentAnalytics } from "@/lib/analytics-engine";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Area, AreaChart,
} from "recharts";
import { motion } from "framer-motion";
import { LoadingSpinner, ProgressRing } from "@/components/ui/animations";
import Navbar from "@/components/Navbar";

const DOMAIN_COLORS: Record<string, string> = {
  "Information and Ideas": "#3b82f6",
  "Craft and Structure": "#8b5cf6",
  "Expression of Ideas": "#06b6d4",
  "Standard English Conventions": "#f59e0b",
  "Algebra": "#10b981",
  "Advanced Math": "#ef4444",
  "Problem-Solving and Data Analysis": "#f97316",
  "Geometry and Trigonometry": "#6366f1",
};

const snappy = [0.25, 0.1, 0.25, 1] as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: snappy } },
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const results = getAllResults();
    const data = computeStudentAnalytics(results);
    setAnalytics(data);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
            <LoadingSpinner size={28} />
            <p className="text-[var(--text-secondary)] text-sm">Loading analytics...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.totalAttempts === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <motion.div
            className="text-center py-16 sm:py-20"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">No exam data yet</h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-sm mx-auto text-sm">
              Complete at least one exam to unlock your personalized analytics dashboard.
            </p>
            <Link
              href="/exams"
              className="inline-block bg-[var(--accent)] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-150 shadow-lg shadow-[var(--accent-glow)] active:scale-[0.98]"
            >
              Take an Exam
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const trendIcon =
    analytics.improvementTrend === "improving" ? "↑" :
    analytics.improvementTrend === "declining" ? "↓" : "→";
  const trendColor =
    analytics.improvementTrend === "improving" ? "text-[var(--correct)]" :
    analytics.improvementTrend === "declining" ? "text-[var(--incorrect)]" :
    "text-[var(--text-secondary)]";
  const trendLabel =
    analytics.improvementTrend === "improving" ? "Improving" :
    analytics.improvementTrend === "declining" ? "Declining" : "Stable";

  const chartData = analytics.scoreHistory.map((entry) => ({
    date: new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: entry.predicted.total.midpoint,
    rw: entry.predicted.rw.midpoint,
    math: entry.predicted.math.midpoint,
    label: entry.examLabel,
  }));

  const domainChartData = analytics.domainAccuracy
    .filter((d) => d.total >= 1)
    .map((d) => ({
      domain: d.domain.length > 18 ? d.domain.slice(0, 16) + "…" : d.domain,
      fullDomain: d.domain,
      pct: d.pct,
      correct: d.correct,
      total: d.total,
    }));

  // Calculate overall accuracy
  const totalCorrect = analytics.domainAccuracy.reduce((s, d) => s + d.correct, 0);
  const totalAttempted = analytics.domainAccuracy.reduce((s, d) => s + d.total, 0);
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <motion.div
        className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Header */}
        <motion.div className="mb-6 sm:mb-8" variants={item}>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">Analytics</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {analytics.totalAttempts} exam{analytics.totalAttempts !== 1 ? "s" : ""} completed
          </p>
        </motion.div>

        {/* ── Score Hero Banner ──────────────────────── */}
        {analytics.latestScore && (
          <motion.div
            className="relative bg-gradient-to-br from-[var(--accent)] via-purple-600 to-indigo-800 text-white rounded-xl sm:rounded-2xl p-5 sm:p-8 mb-6 overflow-hidden shadow-lg shadow-[var(--accent-glow)]"
            variants={item}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-purple-400/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  analytics.improvementTrend === "improving"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : analytics.improvementTrend === "declining"
                      ? "bg-red-500/20 text-red-200"
                      : "bg-white/15 text-white/70"
                }`}>
                  {trendIcon} {trendLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: snappy }}
                >
                  <p className="text-xs text-white/60 mb-1">Predicted Score</p>
                  <p className="text-3xl sm:text-4xl font-bold font-mono">{analytics.latestScore.total.midpoint}</p>
                  <p className="text-xs text-white/40 mt-0.5 font-mono">{analytics.latestScore.total.lower}–{analytics.latestScore.total.upper}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: snappy }}
                >
                  <p className="text-xs text-white/60 mb-1">Reading & Writing</p>
                  <p className="text-2xl sm:text-3xl font-semibold font-mono">{analytics.latestScore.rw.midpoint}</p>
                  <p className="text-xs text-white/40 mt-0.5 font-mono">{analytics.latestScore.rw.lower}–{analytics.latestScore.rw.upper}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.4, ease: snappy }}
                >
                  <p className="text-xs text-white/60 mb-1">Math</p>
                  <p className="text-2xl sm:text-3xl font-semibold font-mono">{analytics.latestScore.math.midpoint}</p>
                  <p className="text-xs text-white/40 mt-0.5 font-mono">{analytics.latestScore.math.lower}–{analytics.latestScore.math.upper}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, ease: snappy }}
                >
                  <p className="text-xs text-white/60 mb-1">Percentile</p>
                  <p className="text-2xl sm:text-3xl font-semibold font-mono">{analytics.latestScore.percentile}<span className="text-base font-normal text-white/50">th</span></p>
                  <p className="text-xs text-white/40 mt-0.5">nationally</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Quick Stats Row ───────────────────────── */}
        <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" variants={item}>
          <QuickStat
            label="Accuracy"
            delay={0}
          >
            <ProgressRing value={overallAccuracy} size={52} strokeWidth={4} color="var(--accent)" bgColor="var(--border)">
              <span className="text-xs font-bold tabular-nums">{overallAccuracy}%</span>
            </ProgressRing>
          </QuickStat>
          <QuickStat label="Avg Time / Q" delay={0.05}>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">{formatTimeShort(analytics.timeAnalysis.avgTimePerQuestionMs)}</p>
          </QuickStat>
          <QuickStat label="R&W Pace" delay={0.1}>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">{formatTimeShort(analytics.timeAnalysis.avgTimeRW)}</p>
          </QuickStat>
          <QuickStat label="Math Pace" delay={0.15}>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">{formatTimeShort(analytics.timeAnalysis.avgTimeMath)}</p>
          </QuickStat>
        </motion.div>

        {/* ── Score History Chart ────────────────────── */}
        {chartData.length >= 2 && (
          <motion.div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 sm:p-6 mb-6"
            variants={item}
          >
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
              Score History
            </h2>
            <div className="h-[200px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} tick={{ fill: "var(--text-secondary)" }} />
                  <YAxis domain={[400, 1600]} fontSize={11} tickLine={false} tick={{ fill: "var(--text-secondary)" }} width={40} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                    formatter={(value) => [String(value ?? ""), ""]}
                    labelFormatter={(label) => label}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#6366f1" }} />
                  <Line type="monotone" dataKey="rw" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="math" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-5 mt-3 text-xs text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#6366f1] rounded" /> Total</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#3b82f6] rounded opacity-60" style={{ borderStyle: "dashed" }} /> R&W</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#10b981] rounded opacity-60" /> Math</span>
            </div>
          </motion.div>
        )}

        {/* ── Two column: Domain Chart + Insights ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Domain Accuracy */}
          {domainChartData.length > 0 && (
            <motion.div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 sm:p-6" variants={item}>
              <h2 className="text-xs font-semibold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">
                Accuracy by Domain
              </h2>
              <div className="h-[280px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainChartData} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" domain={[0, 100]} fontSize={10} tickLine={false} tick={{ fill: "var(--text-secondary)" }} />
                    <YAxis type="category" dataKey="domain" fontSize={10} tickLine={false} width={100} tick={{ fill: "var(--text-secondary)" }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                      formatter={(value) => [`${value ?? 0}%`, "Accuracy"]}
                    />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={14}>
                      {domainChartData.map((entry, idx) => (
                        <Cell key={idx} fill={DOMAIN_COLORS[entry.fullDomain] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Strengths & Weaknesses + Time */}
          <div className="space-y-4">
            {/* Strengths */}
            <motion.div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 sm:p-6" variants={item}>
              <h2 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--correct)]" />
                Strengths
              </h2>
              <div className="space-y-2.5">
                {analytics.strengths.map((s, i) => {
                  const acc = analytics.domainAccuracy.find((d) => d.domain === s);
                  return (
                    <motion.div
                      key={s}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.25 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text)] truncate">{s}</p>
                      </div>
                      {acc && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-[var(--correct)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${acc.pct}%` }}
                              transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: snappy }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium tabular-nums w-8 text-right">{acc.pct}%</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {analytics.strengths.length === 0 && (
                  <p className="text-sm text-[var(--text-secondary)]">Take more exams to identify strengths</p>
                )}
              </div>
            </motion.div>

            {/* Weaknesses */}
            <motion.div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 sm:p-6" variants={item}>
              <h2 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                Focus Areas
              </h2>
              <div className="space-y-2.5">
                {analytics.weaknesses.map((w, i) => {
                  const acc = analytics.domainAccuracy.find((d) => d.domain === w);
                  return (
                    <motion.div
                      key={w}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.06, duration: 0.25 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text)] truncate">{w}</p>
                      </div>
                      {acc && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-[var(--warning)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${acc.pct}%` }}
                              transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: snappy }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium tabular-nums w-8 text-right">{acc.pct}%</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {analytics.weaknesses.length === 0 && (
                  <p className="text-sm text-[var(--text-secondary)]">Take more exams to identify focus areas</p>
                )}
              </div>
            </motion.div>

            {/* Time Insights */}
            <motion.div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 sm:p-6" variants={item}>
              <h2 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
                Time Insights
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--surface-2)] rounded-lg p-3">
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Slowest Area</p>
                  <p className="text-sm font-medium text-[var(--text)] truncate">{analytics.timeAnalysis.slowestDomain || "—"}</p>
                </div>
                <div className="bg-[var(--surface-2)] rounded-lg p-3">
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Exams Taken</p>
                  <p className="text-sm font-medium text-[var(--text)]">{analytics.totalAttempts}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────── */}
        <motion.div variants={item}>
          <Link
            href="/exams"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/5 transition-all duration-150 active:scale-[0.99]"
          >
            Take Another Exam
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Quick Stat Card ────────────────────────────────────────

function QuickStat({
  label,
  delay = 0,
  children,
}: {
  label: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-2 hover:shadow-sm hover:shadow-[var(--accent-glow)] transition-shadow duration-200"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + delay, duration: 0.3 }}
    >
      {children}
      <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}

function formatTimeShort(ms: number): string {
  if (ms < 1000) return "<1s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
