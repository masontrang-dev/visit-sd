/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        accent2: "var(--accent2)",
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        txt: "var(--txt)",
        txt2: "var(--txt2)",
        brd: "var(--brd)",
        error: "var(--error)",
        success: "var(--success)",
        warning: "var(--warning)",
        // Graze momentum (heat) palette — for recency / status / activity signals
        hot: "var(--hot)",
        warm: "var(--warm)",
        cool: "var(--cool)",
        cold: "var(--cold)",
        "hot-bg": "var(--hot-bg)",
        "warm-bg": "var(--warm-bg)",
        "cool-bg": "var(--cool-bg)",
        "cold-bg": "var(--cold-bg)",
        "recency-bg": "var(--recency-bg)",
        "recency-txt": "var(--recency-txt)",
        "open-bg": "var(--open-bg)",
        "open-txt": "var(--open-txt)",
        "closed-bg": "var(--closed-bg)",
        "closed-txt": "var(--closed-txt)",
        "pick-bg": "var(--pick-bg)",
        "pick-txt": "var(--pick-txt)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4" }],
        xs: ["11px", { lineHeight: "1.5" }],
        sm: ["13px", { lineHeight: "1.6" }],
        base: ["15px", { lineHeight: "1.7" }],
        lg: ["17px", { lineHeight: "1.4" }],
        xl: ["22px", { lineHeight: "1.2" }],
        "2xl": ["28px", { lineHeight: "1.1" }],
        "3xl": ["36px", { lineHeight: "1.05" }],
        "4xl": ["48px", { lineHeight: "1" }],
      },
      letterSpacing: {
        tight: "0.02em",
        wide: "0.12em",
        wider: "0.16em",
      },
      borderRadius: {
        // Graze radius scale
        sm: "6px",
        md: "12px",
        lg: "20px",
        xl: "28px",
        card: "14px",
        pill: "100px",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          to: { backgroundPosition: "-200% 0" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(16px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toast-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
        "scroll-fade-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "word-reveal": {
          from: { opacity: "0", transform: "translateY(0.3em)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "badge-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        "sheet-in": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "sheet-out": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "backdrop-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "backdrop-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "toast-in": "toast-in 0.25s ease-out both",
        "toast-out": "toast-out 0.2s ease-in both",
        "scroll-fade-in": "scroll-fade-in 0.5s ease-out both",
        "word-reveal": "word-reveal 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "badge-pulse": "badge-pulse 2s ease-in-out infinite",
        "sheet-in": "sheet-in 340ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "sheet-out": "sheet-out 260ms cubic-bezier(0.55, 0, 0.7, 0.2) forwards",
        "backdrop-in": "backdrop-in 300ms ease-out forwards",
        "backdrop-out": "backdrop-out 220ms ease-in forwards",
      },
    },
  },
  plugins: [],
};
