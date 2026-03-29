"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode } from "react";

// ── Fast, GPU-accelerated easing ───────────────────────────
const snappy = [0.25, 0.1, 0.25, 1] as const;
const spring = { type: "spring" as const, stiffness: 400, damping: 28 };

// ── Reusable animation variants (lightning-fast) ───────────
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: snappy } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: snappy } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: snappy } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: snappy } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: snappy } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: snappy },
  },
};

// ── Page wrapper with instant fade-in ──────────────────────
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Animated card with spring hover ────────────────────────
export function AnimatedCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3, transition: { ...spring, duration: 0.15 } }}
      className={className}
      style={{ willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger wrapper for lists ──────────────────────────────
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Animated counter with spring ───────────────────────────
export function AnimatedNumber({
  value,
  duration = 0.8,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ ...spring, duration: 0.4 }}
    >
      {value}
    </motion.span>
  );
}

// ── Skeleton loader with shimmer ───────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`skeleton ${className}`} />
  );
}

// ── Loading spinner (CSS-only for performance) ─────────────
export function LoadingSpinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <div
      className={`inline-block ${className || ""}`}
      style={{ width: size, height: size }}
    >
      <div
        className="w-full h-full border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin"
        style={{ animationDuration: "0.6s" }}
      />
    </div>
  );
}

// ── Pulse dot indicator ────────────────────────────────────
export function PulseDot({ color = "var(--correct)", size = 8 }: { color?: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full animate-pulse"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

// ── Progress Ring (new) ────────────────────────────────────
export function ProgressRing({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = "var(--accent)",
  bgColor = "var(--border)",
  className,
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  className?: string;
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className={`relative inline-flex items-center justify-center ${className || ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: snappy, delay: 0.2 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Confetti burst (dopamine hit for achievements) ─────────
export function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;

  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const distance = 30 + Math.random() * 20;
    const x = Math.cos((angle * Math.PI) / 180) * distance;
    const y = Math.sin((angle * Math.PI) / 180) * distance;
    const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];
    return { x, y, color: colors[i % colors.length], delay: i * 0.02 };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
          transition={{ duration: 0.6, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
