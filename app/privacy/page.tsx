"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <header className="pt-10 px-6 pb-6 border-b-2 border-txt">
        <p className="text-xs tracking-wide uppercase text-accent font-medium mb-1.5">
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
          <h2 className="font-display text-2xl mb-3">Overview</h2>
          <p className="text-base text-txt leading-relaxed mb-4">
            Visit SD is a personal restaurant guide. This page describes what we
            collect, why, and how long we keep it. We do not sell or share your
            data with third parties outside of the service providers listed
            below.
          </p>
          <p className="text-base text-txt leading-relaxed">
            Two different kinds of data are handled: (1){" "}
            <strong>anonymous site analytics</strong> that everyone generates
            just by visiting, and (2) <strong>account data</strong> that only
            exists if you sign in.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">
            1. Anonymous Site Analytics
          </h2>
          <p className="text-base text-txt leading-relaxed mb-4">
            When you load a page on the public site, we record a page-view
            entry with the following fields:
          </p>
          <ul className="list-disc list-inside text-base text-txt leading-relaxed space-y-2 mb-4">
            <li>
              <strong>Page URL</strong> — which page on our site was viewed
            </li>
            <li>
              <strong>Referrer</strong> — the URL you came from, if any
            </li>
            <li>
              <strong>User agent</strong> — your browser string, and the device
              category (mobile / tablet / desktop) derived from it
            </li>
            <li>
              <strong>IP address</strong> — your connection's IP, used to look
              up approximate location and to attribute traffic
            </li>
            <li>
              <strong>Approximate location</strong> — city, region, and country,
              looked up from your IP via ipapi.co
            </li>
            <li>
              <strong>Session ID</strong> — a random identifier stored in your
              browser's <code>sessionStorage</code> for the duration of the
              browser tab only. It is not a cookie, is not shared across tabs or
              devices, and is discarded when you close the tab. We use it to
              count unique sessions separately from raw page views.
            </li>
          </ul>
          <p className="text-base text-txt leading-relaxed mb-4">
            We also record a small number of interaction events, each tagged
            with the same session ID:
          </p>
          <ul className="list-disc list-inside text-base text-txt leading-relaxed space-y-2 mb-4">
            <li>
              <strong>Outbound clicks</strong> — when you click through to an
              external destination such as Google Maps from a restaurant page
            </li>
            <li>
              <strong>Search queries</strong> — the text of searches you run on
              the site, so we can understand what people are looking for. Only
              "settled" queries (after you pause typing) are recorded, not every
              keystroke.
            </li>
          </ul>
          <p className="text-base text-txt leading-relaxed">
            This data is anonymous: it is not tied to an account, an email, or a
            name. If you are signed in and browsing the public site, these
            entries are still recorded the same way and are not linked to your
            user record.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">
            2. Account Data (When You Sign In)
          </h2>
          <p className="text-base text-txt leading-relaxed mb-4">
            You can sign in with your Google account. If you do, the following
            data is stored in our database, associated with your user record:
          </p>
          <ul className="list-disc list-inside text-base text-txt leading-relaxed space-y-2 mb-4">
            <li>
              <strong>Identity from Google</strong> — your email address, your
              display name, and a URL to your Google profile picture. We receive
              these from Google when you sign in and do not see your Google
              password.
            </li>
            <li>
              <strong>Role assignments</strong> — whether your account has
              admin, curator, or superuser permissions
            </li>
            <li>
              <strong>Role requests</strong> — if you request elevated access,
              the role requested, any message you sent with the request, and the
              outcome
            </li>
            <li>
              <strong>Check-ins</strong> — any restaurant check-ins you record
              (date, optional note, optional photo), tagged with your display
              name
            </li>
            <li>
              <strong>Dish & drink logs</strong> — items you log having ordered,
              including the restaurant, a thumbs up/down, optional notes,
              optional photos, and for drinks any customizations you noted
              (sweetness, ice, toppings, etc.), tied to your user ID
            </li>
            <li>
              <strong>Curator recommendations</strong> — if you're a curator,
              which menu items you've recommended
            </li>
          </ul>
          <p className="text-base text-txt leading-relaxed">
            Account data is kept for as long as your account exists. To request
            deletion of your account and all associated data, use the contact
            method below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">Cookies & Storage</h2>
          <p className="text-base text-txt leading-relaxed mb-4">
            We don't use tracking cookies. Your browser stores:
          </p>
          <ul className="list-disc list-inside text-base text-txt leading-relaxed space-y-2">
            <li>
              A <strong>session cookie from Supabase</strong> after you sign in,
              so you stay signed in. It is cleared when you sign out.
            </li>
            <li>
              A <strong>session ID in sessionStorage</strong> (see above), which
              is cleared when you close the browser tab.
            </li>
            <li>
              A handful of UI preferences in <strong>localStorage</strong>{" "}
              (theme, image density, etc.). These never leave your browser.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">How We Use This Data</h2>
          <ul className="list-disc list-inside text-base text-txt leading-relaxed space-y-2">
            <li>
              Understanding traffic patterns and which pages and restaurants are
              popular
            </li>
            <li>Seeing where visitors are roughly located</li>
            <li>Learning which searches lead to results we don't yet have</li>
            <li>Operating sign-in, role-based access, and personal logs</li>
            <li>Debugging and improving the site</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">Data Retention</h2>
          <ul className="list-disc list-inside text-base text-txt leading-relaxed space-y-2">
            <li>
              <strong>Anonymous analytics</strong> (page views, events,
              searches) are automatically deleted after <strong>90 days</strong>{" "}
              by a daily scheduled job.
            </li>
            <li>
              <strong>Account data</strong> (identity, roles, check-ins, dish
              logs, photos) is kept until you request deletion.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">Third-Party Services</h2>
          <ul className="list-disc list-inside text-base text-txt leading-relaxed space-y-2 mb-4">
            <li>
              <strong>Supabase</strong> — database, authentication, and file
              storage (for photos you upload)
            </li>
            <li>
              <strong>Vercel</strong> — web hosting and deployment
            </li>
            <li>
              <strong>Google</strong> — OAuth sign-in and Google Maps. Your
              email, name, and avatar are received from Google when you sign in.
            </li>
            <li>
              <strong>ipapi.co</strong> — IP geolocation lookup (receives your
              IP address only, to return a city/region/country)
            </li>
          </ul>
          <p className="text-base text-txt leading-relaxed">
            Each service has its own privacy policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">Your Rights</h2>
          <p className="text-base text-txt leading-relaxed">
            You can request a copy of the account data associated with your
            user, or deletion of your account and all associated data, by
            contacting the site administrator (see below). Anonymous analytics
            entries cannot be individually identified or removed on request,
            but they are auto-deleted after 90 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl mb-3">Contact</h2>
          <p className="text-base text-txt leading-relaxed">
            For questions or data requests, contact the site administrator
            through the admin panel or via the account used to host this site.
          </p>
        </section>

        <section className="mb-8">
          <p className="text-sm text-txt2">
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
          className="text-sm font-medium text-txt2 hover:text-txt transition-colors duration-150 no-underline"
        >
          ← Back to home
        </Link>
      </footer>
    </main>
  );
}
