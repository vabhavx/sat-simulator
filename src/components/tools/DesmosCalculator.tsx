"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DesmosCalculatorProps {
  visible: boolean;
  onClose: () => void;
}

const DESMOS_API_KEY = "885b548972a342f6b900496898c97c2e";

export default function DesmosCalculator({
  visible,
  onClose,
}: DesmosCalculatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<unknown>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  // Load Desmos API script once
  useEffect(() => {
    if (scriptLoaded) return;

    const existingScript = document.querySelector(
      'script[src*="desmos.com/api"]'
    );
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.desmos.com/api/v1.9/calculator.js?apiKey=${DESMOS_API_KEY}`;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptError(true);
    document.head.appendChild(script);
  }, [scriptLoaded]);

  // Initialize/destroy calculator instance based on visibility
  useEffect(() => {
    if (!visible || !scriptLoaded || !containerRef.current) return;

    const win = window as unknown as Record<string, unknown>;
    if (typeof win.Desmos === "undefined") return;

    const Desmos = win.Desmos as {
      GraphingCalculator: (
        el: HTMLElement,
        opts?: Record<string, unknown>
      ) => unknown;
    };

    // Clear previous content
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    calculatorRef.current = Desmos.GraphingCalculator(containerRef.current, {
      keypad: true,
      expressions: true,
      settingsMenu: false,
      zoomButtons: true,
      expressionsTopbar: true,
      border: false,
      lockViewport: false,
      pointsOfInterest: true,
      trace: true,
    });

    return () => {
      const calc = calculatorRef.current as { destroy?: () => void } | null;
      if (calc && typeof calc.destroy === "function") {
        calc.destroy();
      }
      calculatorRef.current = null;
    };
  }, [visible, scriptLoaded]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop - click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
            aria-hidden
          />

          {/* Sidebar panel */}
          <motion.div
            initial={{ x: "-100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0.8 }}
            transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[420px] max-w-[85vw] flex flex-col bg-[var(--surface)] shadow-2xl shadow-black/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--accent)] text-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="8" y2="10.01" />
                  <line x1="12" y1="10" x2="12" y2="10.01" />
                  <line x1="16" y1="10" x2="16" y2="10.01" />
                  <line x1="8" y1="14" x2="8" y2="14.01" />
                  <line x1="12" y1="14" x2="12" y2="14.01" />
                  <line x1="16" y1="14" x2="16" y2="14.01" />
                  <line x1="8" y1="18" x2="8" y2="18.01" />
                  <line x1="12" y1="18" x2="16" y2="18" />
                </svg>
                <span className="text-sm font-semibold tracking-wide">
                  Graphing Calculator
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/15 transition-colors"
                aria-label="Close calculator"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Calculator body */}
            <div ref={containerRef} className="flex-1 bg-[var(--surface)] min-h-0">
              {!scriptLoaded && !scriptError && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                  <p className="text-sm text-[var(--text-secondary)]">Loading Desmos...</p>
                </div>
              )}
              {scriptError && (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <p className="text-sm text-[var(--text-secondary)]">Failed to load calculator</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Check your internet connection</p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex-shrink-0 px-4 py-2 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">
                Desmos Graphing
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Press Calculator button to close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
