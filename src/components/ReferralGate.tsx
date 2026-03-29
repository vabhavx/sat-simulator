"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REQUIRED_REFERRALS } from "@/hooks/useReferral";

// ── Referral Gate Overlay (for exam cards) ──────────────────

interface ReferralGateProps {
  referralCount: number;
  referralLink: string;
  isUnlocked: boolean;
  children: React.ReactNode;
}

export function ReferralGateOverlay({
  referralCount,
  referralLink,
  children,
}: ReferralGateProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative cursor-pointer" onClick={() => setShowModal(true)}>
        {/* Blurred content */}
        <div className="pointer-events-none select-none" style={{ filter: "blur(5px)" }}>
          {children}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface)]/60 backdrop-blur-[2px] rounded-xl z-10">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-[var(--text)] text-center px-2">
            Invite friends to unlock
          </p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            {referralCount}/{REQUIRED_REFERRALS} referrals
          </p>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ReferralModal
            referralCount={referralCount}
            referralLink={referralLink}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Premium Gate (for download cards) ───────────────────────

interface PremiumGateProps {
  referralCount: number;
  referralLink: string;
  children: React.ReactNode;
}

export function PremiumGateOverlay({
  referralCount,
  referralLink,
  children,
}: PremiumGateProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative cursor-pointer group" onClick={() => setShowModal(true)}>
        {/* Blurred content */}
        <div className="pointer-events-none select-none" style={{ filter: "blur(4px)" }}>
          {children}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface)]/50 backdrop-blur-[1px] rounded-xl z-10 transition-all group-hover:bg-[var(--surface)]/70">
          <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-1.5 group-hover:border-[var(--accent)]/30 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold text-[var(--text)] text-center">Locked</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Share to unlock</p>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <ReferralModal
            referralCount={referralCount}
            referralLink={referralLink}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Referral Modal ──────────────────────────────────────────

interface ReferralModalProps {
  referralCount: number;
  referralLink: string;
  onClose: () => void;
}

function ReferralModal({ referralCount, referralLink, onClose }: ReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const progress = (referralCount / REQUIRED_REFERRALS) * 100;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Fudsat — Free SAT Practice",
          text: "Get free SAT practice exams, question banks, and premium materials. Join using my referral link!",
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-md bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all z-10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header gradient */}
        <div className="h-1.5 bg-gradient-to-r from-[var(--accent)] via-purple-500 to-blue-500" />

        <div className="p-6 sm:p-8">
          {/* Lock icon */}
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]">
              <path d="M12 17v-2" />
              <path d="M8 11V7a4 4 0 1 1 8 0v4" />
              <rect x="4" y="11" width="16" height="10" rx="2" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-[var(--text)] text-center tracking-tight">
            Unlock All Content
          </h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mt-1.5 max-w-sm mx-auto">
            Share your referral link with 6 friends. When they sign up, you unlock all exams and premium materials — forever.
          </p>

          {/* Progress */}
          <div className="mt-6 mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold text-[var(--text)]">Progress</span>
              <span className="font-bold text-[var(--accent)] tabular-nums">
                {referralCount}/{REQUIRED_REFERRALS}
              </span>
            </div>
            <div className="h-3 rounded-full bg-[var(--surface-2)] border border-[var(--border)]/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, var(--accent), #8b5cf6, #3b82f6)" }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              {REQUIRED_REFERRALS - referralCount} more {REQUIRED_REFERRALS - referralCount === 1 ? "friend" : "friends"} needed
            </p>
          </div>

          {/* Referral link */}
          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-2">
            <div className="flex-1 min-w-0 px-2">
              <p className="text-xs text-[var(--text-secondary)] truncate font-mono">
                {referralLink}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                copied
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="w-full mt-3 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share with Friends
          </button>

          {/* How it works */}
          <div className="mt-6 pt-5 border-t border-[var(--border)]/60">
            <p className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">How it works</p>
            <div className="space-y-2.5">
              {[
                { step: "1", text: "Copy your unique referral link above" },
                { step: "2", text: "Share it with 6 friends or classmates" },
                { step: "3", text: "Once they sign up, all content unlocks for you" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Inline Referral Progress Bar ────────────────────────────

interface ReferralProgressProps {
  referralCount: number;
  referralLink: string;
  compact?: boolean;
}

export function ReferralProgressBar({ referralCount, referralLink, compact = false }: ReferralProgressProps) {
  const [showModal, setShowModal] = useState(false);
  const progress = (referralCount / REQUIRED_REFERRALS) * 100;

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/15 transition-colors text-xs font-semibold"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {referralCount}/{REQUIRED_REFERRALS}
        </button>
        <AnimatePresence>
          {showModal && (
            <ReferralModal
              referralCount={referralCount}
              referralLink={referralLink}
              onClose={() => setShowModal(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.div
        className="bg-gradient-to-r from-[var(--accent)]/5 to-purple-500/5 border border-[var(--accent)]/15 rounded-xl p-4 sm:p-5 cursor-pointer hover:border-[var(--accent)]/30 transition-colors"
        onClick={() => setShowModal(true)}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--text)]">
              Invite friends to unlock all content
            </span>
          </div>
          <span className="text-sm font-bold text-[var(--accent)] tabular-nums">
            {referralCount}/{REQUIRED_REFERRALS}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, var(--accent), #8b5cf6)" }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
          {REQUIRED_REFERRALS - referralCount > 0
            ? `Share your link with ${REQUIRED_REFERRALS - referralCount} more friends to unlock`
            : "All content unlocked!"}
        </p>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <ReferralModal
            referralCount={referralCount}
            referralLink={referralLink}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
