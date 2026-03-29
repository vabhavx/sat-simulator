"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useNotifications, Notification } from "@/components/NotificationProvider";

// ── Notification Icon Map ──────────────────────────────────

function NotifIcon({ icon }: { icon?: string }) {
  switch (icon) {
    case "spark":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "book":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case "chart":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "trophy":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 22V8a6 6 0 0 1 12 0v14" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
}

// ── Time Ago ───────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Notification Type Colors ───────────────────────────────

function typeColor(type: Notification["type"]) {
  switch (type) {
    case "announcement": return "bg-indigo-500";
    case "update": return "bg-emerald-500";
    case "achievement": return "bg-amber-500";
    case "reminder": return "bg-blue-500";
    default: return "bg-gray-500";
  }
}

// ── Notification Panel ─────────────────────────────────────

function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-150"
        whileTap={{ scale: 0.92 }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[var(--accent)] text-white text-[10px] font-bold rounded-full px-1 shadow-lg shadow-[var(--accent-glow)]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black/10 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text)]">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className={`group relative flex gap-3 px-4 py-3.5 border-b border-[var(--border)]/50 hover:bg-[var(--surface-2)] transition-colors cursor-pointer ${
                      !notif.read ? "bg-[var(--accent-glow)]/30" : ""
                    }`}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.href) {
                        setOpen(false);
                        window.location.href = notif.href;
                      }
                    }}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${typeColor(notif.type)} bg-opacity-15 flex items-center justify-center text-[var(--accent)]`}>
                      <NotifIcon icon={notif.icon} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!notif.read ? "font-semibold text-[var(--text)]" : "font-medium text-[var(--text)]"}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 font-medium">
                        {timeAgo(notif.timestamp)}
                      </p>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-3)] transition-all text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      aria-label="Dismiss"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mobile Menu ────────────────────────────────────────────

function MobileMenu({ links, user, onSignOut }: { links: { href: string; label: string; active: boolean }[]; user: any; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all"
        whileTap={{ scale: 0.92 }}
        aria-label="Menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full bg-[var(--surface)] border-b border-[var(--border)] overflow-hidden z-40"
          >
            <div className="px-4 py-3 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    link.active
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <>
                  <div className="h-px bg-[var(--border)] my-2" />
                  <div className="px-3 py-2 text-xs text-[var(--text-tertiary)] truncate">{user.email}</div>
                  <button
                    onClick={() => { setOpen(false); onSignOut(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const navLinks = user
    ? [
        { href: "/exams", label: "Exams" },
        { href: "/question-bank", label: "Questions" },
        { href: "/premium", label: "Premium" },
        { href: "/dashboard", label: "Analytics" },
        { href: "/settings", label: "Settings" },
      ]
    : [];

  const links = navLinks.map((l) => ({
    ...l,
    active: pathname === l.href || pathname.startsWith(l.href + "/"),
  }));

  return (
    <motion.nav
      className="sticky top-0 z-40 bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)]/80"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between relative">
        {/* Logo */}
        <Link
          href={user ? "/exams" : "/"}
          className="text-base font-bold tracking-tight text-[var(--text)] hover:opacity-70 transition-opacity flex-shrink-0"
        >
          Fudsat
        </Link>

        {/* Desktop nav links */}
        {user && (
          <div className="hidden sm:flex items-center gap-1 ml-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                  link.active
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {link.label}
                {link.active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-[11px] left-2 right-2 h-[2px] bg-[var(--accent)] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationPanel />
              <button
                onClick={signOut}
                className="hidden sm:block text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--surface-2)]"
              >
                Sign out
              </button>
              <MobileMenu links={links} user={user} onSignOut={signOut} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors px-3 py-1.5"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm bg-[var(--accent)] text-white px-4 py-1.5 rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
