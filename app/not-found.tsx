import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <p className="text-xs tracking-wide uppercase font-medium text-accent mb-3">
          404 · Not Found
        </p>
        <h1 className="font-display text-[clamp(56px,12vw,96px)] leading-[0.9] tracking-tight mb-4">
          Lost the<br />
          <span className="text-accent">plot</span>
        </h1>
        <p className="text-base text-txt2 mb-8">
          We couldn&rsquo;t find that page. It may have moved, or it was never
          here to begin with.
        </p>
        <Link
          href="/"
          className="inline-block py-3 px-6 rounded-none text-sm font-medium bg-accent text-white no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Back to the guide
        </Link>
      </div>
    </main>
  );
}
