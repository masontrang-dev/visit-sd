"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <p className="text-xs tracking-wide uppercase font-medium text-accent mb-3">
          Something broke
        </p>
        <h1 className="font-display text-[clamp(56px,12vw,96px)] leading-[0.9] tracking-tight mb-4">
          Hit a<br />
          <span className="text-accent">snag</span>
        </h1>
        <p className="text-base text-txt2 mb-8">
          An unexpected error occurred. Try again, or head back to the guide.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="py-3 px-6 rounded-lg text-sm font-medium bg-accent text-white transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="py-3 px-6 rounded-lg text-sm font-medium bg-bg2 text-txt border-[1.5px] border-brd no-underline transition-colors hover:border-txt"
          >
            Home
          </Link>
        </div>
        {error.digest && (
          <p className="text-2xs text-txt2 opacity-60 mt-6 font-mono">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
