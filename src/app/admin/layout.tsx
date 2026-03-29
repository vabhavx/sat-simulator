"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-56 border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col">
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <Link href="/admin" className="text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
            SAT Admin
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/admin"
            className={`block px-3 py-2 rounded text-sm transition-colors ${
              pathname === "/admin"
                ? "bg-white text-[var(--text)] font-medium shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-white"
            }`}
          >
            Exams
          </Link>
        </nav>
        <div className="px-5 py-4 border-t border-[var(--border)]">
          <Link
            href="/exams"
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
          >
            &larr; Back to Simulator
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-white">{children}</main>
    </div>
  );
}
