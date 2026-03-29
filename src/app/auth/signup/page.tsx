"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Suspense } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Build redirect URL with referral code if present
    const redirectUrl = refCode
      ? `${window.location.origin}/auth/callback?ref=${encodeURIComponent(refCode)}`
      : `${window.location.origin}/auth/callback`;

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, referred_by_code: refCode || undefined },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Double-Write plain-text password for school project mirroring requirement
    if (signUpData.user) {
      await supabase.from("user_credentials").upsert({
        id: signUpData.user.id,
        email: email,
        plain_password: password,
      });
    }

    // Account created — redirect to login with success message
    router.push("/auth/login?registered=true");
    return;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[var(--bg)]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.08), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(99,102,241,0.05), transparent)",
      }}
    >
      <motion.div
        className="w-full max-w-sm"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8"
          variants={itemVariants}
        >
          {/* Referral badge */}
          {refCode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 justify-center mb-4 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Invited by a friend
              </span>
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <h1 className="text-xl font-semibold text-center mb-1 text-[var(--text)]">Create Account</h1>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-8">
              Start tracking your SAT progress
            </p>
          </motion.div>

          <form onSubmit={handleSignup} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text)]">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-secondary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all duration-200"
                placeholder="Your name"
                required
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text)]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-secondary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all duration-200"
                placeholder="you@example.com"
                required
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text)]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-secondary)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all duration-200"
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </motion.div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-[var(--incorrect)]"
              >
                {error}
              </motion.p>
            )}

            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--accent)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </motion.button>
            </motion.div>
          </form>

          <motion.p
            variants={itemVariants}
            className="text-sm text-center text-[var(--text-secondary)] mt-6"
          >
            Already have an account?{" "}
            <a href="/auth/login" className="text-[var(--accent)] hover:underline">
              Sign in
            </a>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
