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
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "toast-in": "toast-in 0.25s ease-out both",
        "toast-out": "toast-out 0.2s ease-in both",
      },
    },
  },
  plugins: [],
};
