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
        "recency-bg": "var(--recency-bg)",
        "recency-txt": "var(--recency-txt)",
        "open-bg": "var(--open-bg)",
        "open-txt": "var(--open-txt)",
        "closed-bg": "var(--closed-bg)",
        "closed-txt": "var(--closed-txt)",
        "pick-bg": "var(--pick-bg)",
        "pick-txt": "var(--pick-txt)",
        "overlay-bg": "var(--overlay-bg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4" }],
        xs: ["11px", { lineHeight: "1.4" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.5" }],
        lg: ["18px", { lineHeight: "1.3" }],
        xl: ["22px", { lineHeight: "1.2" }],
        "2xl": ["32px", { lineHeight: "1.1" }],
      },
      letterSpacing: {
        tight: "0.02em",
        wide: "0.12em",
      },
      borderRadius: {
        pill: "20px",
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
        "modal-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "modal-out": {
          from: { opacity: "1", transform: "translateY(0) scale(1)" },
          to: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
        },
        "heart-pulse": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.28)" },
          "55%": { transform: "scale(0.92)" },
          "80%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
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
        "modal-in": "modal-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "modal-out": "modal-out 160ms cubic-bezier(0.55, 0, 0.7, 0.2) both",
        "heart-pulse": "heart-pulse 420ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
