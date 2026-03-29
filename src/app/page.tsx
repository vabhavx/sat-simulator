"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/animations";

// --- Animation Variants ---

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const staggerCards = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// --- Floating Orb Background ---

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          top: "-10%",
          right: "-10%",
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 15, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          bottom: "-5%",
          left: "-8%",
        }}
        animate={{
          x: [0, -25, 15, 0],
          y: [0, 20, -10, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
          top: "40%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// --- Animated Counter ---

function AnimatedCounter({ target }: { target: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 2,
      ease: [0.25, 0.1, 0.25, 1] as const,
    });
    return controls.stop;
  }, [count, target]);

  return <motion.span>{rounded}</motion.span>;
}

// --- Grid Pattern ---

function GridPattern() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// --- Value Strip Item ---

function ValueItem({ label, description }: { label: string; description: string }) {
  return (
    <motion.div
      className="text-center px-4"
      variants={cardItem}
    >
      <p className="text-sm font-semibold text-[var(--accent)] tracking-wide uppercase mb-1.5">
        {label}
      </p>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

// --- Feature Card ---

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent)]/20 hover:shadow-lg hover:shadow-[var(--accent-glow)] transition-all duration-300"
      variants={cardItem}
      whileHover={{ y: -3, transition: { duration: 0.25 } }}
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--accent)]/15 transition-colors duration-300">
        {icon}
      </div>
      <h3 className="font-semibold text-[var(--text)] mb-1.5">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
    </motion.div>
  );
}

// --- Main Landing Page ---

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/exams");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <LoadingSpinner size={32} />
        </motion.div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] relative mesh-gradient">
      <GridPattern />
      <FloatingOrbs />

      {/* Nav */}
      <motion.nav
        className="relative z-10 flex items-center justify-between max-w-5xl mx-auto px-6 py-5"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <span className="text-lg font-bold tracking-tight text-[var(--text)]">
          Fudsat
        </span>
        <div className="flex items-center gap-4">
          <a
            href="/auth/login"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors duration-200"
          >
            Sign in
          </a>
          <motion.a
            href="/auth/signup"
            className="text-sm bg-[var(--accent)] text-white px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200 font-medium shadow-lg shadow-[var(--accent-glow)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Started
          </motion.a>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroVariants}
        >
          <motion.div variants={heroItem} className="mb-6">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-3.5 py-1.5 rounded-full tracking-wide uppercase border border-[var(--accent)]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Digital SAT Preparation
            </span>
          </motion.div>

          <motion.h1
            variants={heroItem}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text)] tracking-tight leading-[1.1] mb-5"
          >
            Score higher.
            <br />
            <span className="text-[var(--accent)]">Study sharper.</span>
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed mb-10"
          >
            Full-length DSAT practice with real exam conditions, instant scoring, and performance analytics.
          </motion.p>

          <motion.div variants={heroItem} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.a
              href="/auth/signup"
              className="inline-flex items-center justify-center bg-[var(--accent)] text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-lg shadow-[var(--accent-glow)] w-full sm:w-auto"
              whileHover={{ scale: 1.03, boxShadow: "0 8px 30px rgba(99,102,241,0.35)" }}
              whileTap={{ scale: 0.98 }}
            >
              Start Practicing
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </motion.a>
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors duration-200 px-6 py-3.5 w-full sm:w-auto"
            >
              Already have an account?
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Value Strip */}
      <motion.section
        className="relative z-10 max-w-3xl mx-auto px-6 pb-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerCards}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ValueItem label="Realistic" description="Actual exam format and timing" />
          <ValueItem label="Instant" description="Scores and explanations on submit" />
          <ValueItem label="Tracked" description="Progress analytics over time" />
          <ValueItem label="Complete" description="50+ full-length practice tests" />
        </div>
      </motion.section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      {/* Features */}
      <motion.section
        className="relative z-10 max-w-5xl mx-auto px-6 py-20 sm:py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionVariants}
      >
        <motion.div className="text-center mb-14" variants={sectionVariants}>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text)] tracking-tight mb-3">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
            Built for focused, efficient SAT preparation.
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={staggerCards}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Timed Sections"
            description="Real exam timing with section-by-section pacing and automatic transitions."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
            title="Score Analytics"
            description="Track performance trends, identify weak areas, and measure improvement over time."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            }
            title="Answer Verification"
            description="Instant answer checking against official College Board answer keys."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            }
            title="Adaptive Format"
            description="Mirrors the real Digital SAT adaptive testing structure section by section."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            }
            title="Full Test Library"
            description="Access 50+ official practice tests spanning 2023 through 2025 releases."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
            title="Secure Progress"
            description="Your scores, attempts, and analytics saved securely to your account."
          />
        </motion.div>
      </motion.section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      {/* Stats / Trust */}
      <motion.section
        className="relative z-10 max-w-4xl mx-auto px-6 py-20 sm:py-24 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionVariants}
      >
        <div className="grid grid-cols-3 gap-8 mb-12">
          <motion.div variants={cardItem}>
            <p className="text-3xl sm:text-4xl font-bold text-[var(--accent)] mb-1">
              <AnimatedCounter target={50} />+
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Practice Tests</p>
          </motion.div>
          <motion.div variants={cardItem}>
            <p className="text-3xl sm:text-4xl font-bold text-[var(--accent)] mb-1">
              <AnimatedCounter target={2700} />+
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Questions</p>
          </motion.div>
          <motion.div variants={cardItem}>
            <p className="text-3xl sm:text-4xl font-bold text-[var(--accent)] mb-1">
              100<span className="text-xl">%</span>
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Free to Use</p>
          </motion.div>
        </div>
        <motion.p
          className="text-[var(--text-secondary)] max-w-md mx-auto text-sm leading-relaxed"
          variants={cardItem}
        >
          Built from official College Board materials. No gimmicks, no paywalls, no compromises on quality.
        </motion.p>
      </motion.section>

      {/* Final CTA */}
      <motion.section
        className="relative z-10 max-w-5xl mx-auto px-6 pb-24 sm:pb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={sectionVariants}
      >
        <div className="relative bg-gradient-to-br from-[var(--accent)] to-purple-600 rounded-2xl px-8 py-16 sm:px-16 sm:py-20 text-center overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute w-[400px] h-[400px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
                top: "-20%",
                right: "-10%",
              }}
            />
            <div
              className="absolute w-[300px] h-[300px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
                bottom: "-15%",
                left: "-5%",
              }}
            />
          </div>

          <motion.h2
            className="relative text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3"
            variants={cardItem}
          >
            Ready to start?
          </motion.h2>
          <motion.p
            className="relative text-white/70 mb-8 max-w-sm mx-auto"
            variants={cardItem}
          >
            Create your free account and take your first practice test today.
          </motion.p>
          <motion.div variants={cardItem}>
            <motion.a
              href="/auth/signup"
              className="inline-flex items-center justify-center bg-white text-[#6366f1] px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-white/90 transition-all duration-200 shadow-lg shadow-black/20"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              Create Free Account
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </motion.a>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl mx-auto px-6 pb-10">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-[var(--text-tertiary)]">
            Fudsat
          </span>
          <div className="flex items-center gap-6">
            <a
              href="/auth/login"
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors duration-200"
            >
              Sign in
            </a>
            <a
              href="/auth/signup"
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors duration-200"
            >
              Sign up
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
