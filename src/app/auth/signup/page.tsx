"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

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

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="text-lg font-semibold mb-2 text-[var(--text)]">Check your email</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              We sent a confirmation link to <strong className="text-[var(--text)]">{email}</strong>
            </p>
            <a
              href="/auth/login"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Back to login
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

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
