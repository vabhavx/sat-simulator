"use client";

interface MathReferenceSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function MathReferenceSheet({
  visible,
  onClose,
}: MathReferenceSheetProps) {
  return (
    <>
      {/* Backdrop */}
      {visible && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-[var(--surface)] shadow-2xl shadow-black/30 z-50 transform transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--accent)] text-white">
          <h2 className="font-semibold text-base">Reference Sheet</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg
              width="16"
              height="16"
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

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-56px)] px-6 py-6">
          <div className="space-y-6 text-[var(--text)] text-sm leading-relaxed">
            {/* Area formulas */}
            <section>
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Area
              </h3>
              <div className="space-y-2 pl-2">
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Circle:</span>{" "}
                  <span className="font-mono">
                    A = &pi;r&sup2;
                  </span>
                </div>
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">
                    Circumference:
                  </span>{" "}
                  <span className="font-mono">C = 2&pi;r</span>
                </div>
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Rectangle:</span>{" "}
                  <span className="font-mono">A = lw</span>
                </div>
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Triangle:</span>{" "}
                  <span className="font-mono">A = &frac12;bh</span>
                </div>
              </div>
            </section>

            <hr className="border-[var(--border)]" />

            {/* Pythagorean theorem */}
            <section>
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Pythagorean Theorem
              </h3>
              <div className="pl-2">
                <span className="font-mono text-base">
                  a&sup2; + b&sup2; = c&sup2;
                </span>
              </div>
            </section>

            <hr className="border-[var(--border)]" />

            {/* Special right triangles */}
            <section>
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Special Right Triangles
              </h3>
              <div className="space-y-3 pl-2">
                <div className="bg-[var(--surface-2)] rounded-lg p-4 border border-[var(--border)]">
                  <p className="font-medium text-[var(--text)] mb-1">
                    30-60-90 Triangle
                  </p>
                  <p className="font-mono text-sm">
                    Sides in ratio: x : x&radic;3 : 2x
                  </p>
                </div>
                <div className="bg-[var(--surface-2)] rounded-lg p-4 border border-[var(--border)]">
                  <p className="font-medium text-[var(--text)] mb-1">
                    45-45-90 Triangle
                  </p>
                  <p className="font-mono text-sm">
                    Sides in ratio: x : x : x&radic;2
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-[var(--border)]" />

            {/* Volume formulas */}
            <section>
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Volume
              </h3>
              <div className="space-y-2 pl-2">
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">
                    Rectangular Prism (Box):
                  </span>{" "}
                  <span className="font-mono">V = lwh</span>
                </div>
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Cylinder:</span>{" "}
                  <span className="font-mono">V = &pi;r&sup2;h</span>
                </div>
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Sphere:</span>{" "}
                  <span className="font-mono">
                    V = &#8308;&frasl;&#8323;&pi;r&sup3;
                  </span>
                </div>
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Cone:</span>{" "}
                  <span className="font-mono">
                    V = &frac13;&pi;r&sup2;h
                  </span>
                </div>
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Pyramid:</span>{" "}
                  <span className="font-mono">V = &frac13;lwh</span>
                </div>
              </div>
            </section>

            <hr className="border-[var(--border)]" />

            {/* Additional facts */}
            <section>
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Additional Information
              </h3>
              <div className="space-y-3 pl-2">
                <p>
                  The number of degrees of arc in a circle is{" "}
                  <span className="font-mono font-semibold">360</span>.
                </p>
                <p>
                  The number of radians of arc in a circle is{" "}
                  <span className="font-mono font-semibold">2&pi;</span>.
                </p>
                <p>
                  The sum of the measures in degrees of the angles of a triangle
                  is <span className="font-mono font-semibold">180</span>.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
