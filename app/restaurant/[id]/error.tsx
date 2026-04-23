"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RestaurantError({
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
    <main className="min-h-screen p-6">
      <Link
        href="/"
        className="text-xs tracking-wide uppercase font-medium text-accent2 no-underline"
      >
        ← Back to list
      </Link>
      <div className="mt-12 max-w-md">
        <p className="text-xs tracking-wide uppercase font-medium text-accent mb-3">
          Couldn&rsquo;t load this restaurant
        </p>
        <h1 className="font-display text-4xl tracking-tight mb-3">
          Something went wrong
        </h1>
        <p className="text-sm text-txt2 mb-6">
          We hit an error loading this page. You can retry, or go back to the
          list.
        </p>
        <button
          onClick={reset}
          className="py-2.5 px-5 rounded-none text-sm font-medium bg-accent text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
