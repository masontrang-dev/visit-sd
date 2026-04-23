"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setDark(true);
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const isDark = mounted && dark;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      aria-pressed={isDark}
      className="relative w-11 h-11 flex items-center justify-center rounded-full border-[1.5px] border-brd bg-bg text-txt2 hover:text-txt hover:border-txt transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg overflow-hidden"
    >
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center text-lg transition-all duration-300 ${
          isDark
            ? "opacity-0 -rotate-90 scale-75"
            : "opacity-100 rotate-0 scale-100"
        }`}
      >
        ☾
      </span>
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center text-lg transition-all duration-300 ${
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-75"
        }`}
      >
        ☀︎
      </span>
    </button>
  );
}
