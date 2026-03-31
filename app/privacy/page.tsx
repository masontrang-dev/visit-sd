"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <header className="pt-10 px-6 pb-6 border-b-2 border-txt">
        <p className="text-[11px] tracking-[0.15em] uppercase text-accent font-medium mb-1.5">
          Legal · San Diego
        </p>
        <h1 className="font-display text-[clamp(48px,10vw,80px)] leading-[0.88]">
          PRIVACY
          <br />
          <span className="text-accent">POLICY</span>
        </h1>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <section className="mb-8">
          <h2 className="font-display text-[28px] mb-3">Overview</h2>
          <p className="text-[15px] text-txt leading-relaxed mb-4">
            Visit SD is a personal restaurant guide. We collect minimal
            analytics data to understand how the site is used and where our
            visitors come from. We do not sell or share your data with third
            parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-[28px] mb-3">Data We Collect</h2>
          <p className="text-[15px] text-txt leading-relaxed mb-4">
            When you visit this site, we automatically collect:
          </p>
          <ul className="list-disc list-inside text-[15px] text-txt leading-relaxed space-y-2 mb-4">
            <li>
              <strong>Page URL</strong> — which pages you visit on our site
            </li>
            <li>
              <strong>Referrer</strong> — the website you came from (if any)
            </li>
            <li>
              <strong>User Agent</strong> — your browser and device type
              (mobile/desktop/tablet)
            </li>
            <li>
              <strong>IP Address</strong> — your internet connection's IP
              address
            </li>
            <li>
              <strong>Geographic Location</strong> — approximate city, region,
              and country derived from your IP address
            </li>
          </ul>
          <p className="text-[15px] text-txt leading-relaxed">
            We do <strong>not</strong> collect cookies, personal identifiers, or
            any personally identifiable information (PII).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-[28px] mb-3">
            How We Use Your Data
          </h2>
          <p className="text-[15px] text-txt leading-relaxed mb-4">
            We use this data solely for:
          </p>
          <ul className="list-disc list-inside text-[15px] text-txt leading-relaxed space-y-2">
            <li>Understanding visitor traffic patterns</li>
            <li>Identifying which devices people use (mobile vs desktop)</li>
            <li>Seeing where our visitors are located geographically</li>
            <li>Tracking which external sites refer visitors to us</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-[28px] mb-3">Data Retention</h2>
          <p className="text-[15px] text-txt leading-relaxed">
            Analytics data is automatically deleted after{" "}
            <strong>90 days</strong> via a daily scheduled cleanup job. We do
            not retain historical analytics beyond this period.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-[28px] mb-3">
            Third-Party Services
          </h2>
          <p className="text-[15px] text-txt leading-relaxed mb-4">
            We use the following third-party services:
          </p>
          <ul className="list-disc list-inside text-[15px] text-txt leading-relaxed space-y-2 mb-4">
            <li>
              <strong>Supabase</strong> — database hosting for restaurant data
              and analytics
            </li>
            <li>
              <strong>Vercel</strong> — web hosting and deployment
            </li>
            <li>
              <strong>Google Maps</strong> — interactive maps and place search
            </li>
            <li>
              <strong>ipapi.co</strong> — IP geolocation lookup (converts IP
              addresses to city/region/country)
            </li>
          </ul>
          <p className="text-[15px] text-txt leading-relaxed">
            Each service has its own privacy policy. Your IP address is shared
            with ipapi.co for geolocation lookup only.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-[28px] mb-3">Your Rights</h2>
          <p className="text-[15px] text-txt leading-relaxed">
            Since we do not collect personally identifiable information, there
            is no personal data to request, modify, or delete. All analytics
            data is anonymous and aggregated.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-[28px] mb-3">Contact</h2>
          <p className="text-[15px] text-txt leading-relaxed">
            If you have questions about this privacy policy, please contact the
            site administrator through the admin panel.
          </p>
        </section>

        <section className="mb-8">
          <p className="text-[13px] text-txt2">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </section>
      </article>

      <footer className="p-6 flex justify-center">
        <Link
          href="/"
          className="text-[13px] font-medium text-txt2 hover:text-txt transition-colors duration-150 no-underline"
        >
          ← Back to home
        </Link>
      </footer>
    </main>
  );
}
