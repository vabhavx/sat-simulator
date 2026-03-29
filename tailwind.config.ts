import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          glow: "var(--accent-glow)",
        },
        reward: "var(--reward)",
      },
      boxShadow: {
        glow: "0 0 20px var(--accent-glow)",
        "glow-sm": "0 0 10px var(--accent-glow)",
        "glow-lg": "0 0 40px var(--accent-glow)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.12)",
        "glass-lg": "0 16px 48px rgba(0, 0, 0, 0.2)",
      },
      backdropBlur: {
        glass: "20px",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "grain": "grain 8s steps(10) infinite",
        "float": "float 6s ease-in-out infinite",
        "score-count": "score-count 2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "ring-fill": "ring-fill 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 var(--accent-glow)" },
          "50%": { boxShadow: "0 0 20px 4px var(--accent-glow)" },
        },
        "grain": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-5%, -10%)" },
          "20%": { transform: "translate(-15%, 5%)" },
          "30%": { transform: "translate(7%, -25%)" },
          "40%": { transform: "translate(-5%, 25%)" },
          "50%": { transform: "translate(-15%, 10%)" },
          "60%": { transform: "translate(15%, 0%)" },
          "70%": { transform: "translate(0%, 15%)" },
          "80%": { transform: "translate(3%, 35%)" },
          "90%": { transform: "translate(-10%, 10%)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "score-count": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ring-fill": {
          "0%": { strokeDashoffset: "283" },
          "100%": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
