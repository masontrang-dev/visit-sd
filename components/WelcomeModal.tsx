"use client";

import { useEffect, useState } from "react";
import Modal, { ModalHeader } from "./Modal";

type Platform = "ios" | "android" | "other";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "welcome-seen";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isInstalledPWA(): boolean {
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;
  const displayStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayStandalone;
}

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    if (isInstalledPWA()) return;
    setPlatform(detectPlatform());
    setOpen(true);
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  }

  async function triggerInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    dismiss();
  }

  if (!open) return null;

  const showInstallSection = platform === "ios" || platform === "android";
  const showAndroidPrompt = platform === "android" && installEvent !== null;

  return (
    <Modal open onClose={dismiss} size="md" ariaLabel="Welcome to VISIT SD">
      <ModalHeader title="WELCOME TO VISIT SD" onClose={dismiss} />
      <div className="p-6 pt-4">
        <p className="text-sm text-txt2">
          VISIT SD is our personal guide to San Diego — restaurants we
          actually eat at, from simple weeknight spots to nicer evenings out.
          Both the app and our restaurant list are a work in progress. We&apos;re
          excited for you to try some of our favorites and would love to hear
          what you think of any of the places we&apos;ve suggested!
        </p>

        {showInstallSection && (
          <>
            <div className="my-5 border-t border-brd" />
            <p className="font-display text-lg tracking-tight mb-3">
              ADD TO HOME SCREEN
            </p>
            {platform === "ios" && (
              <ol className="text-sm text-txt2 space-y-2 list-decimal pl-5">
                <li>
                  Tap the Share button{" "}
                  <span aria-hidden="true">&#x2BAD;</span>
                </li>
                <li>Tap &ldquo;Add to Home Screen&rdquo;</li>
                <li>Tap &ldquo;Add&rdquo;</li>
              </ol>
            )}
            {showAndroidPrompt && (
              <button
                type="button"
                onClick={triggerInstall}
                className="btn-primary w-full text-sm"
              >
                Add to Home Screen
              </button>
            )}
            {platform === "android" && !installEvent && (
              <p className="text-sm text-txt2">
                Open your browser menu and choose &ldquo;Add to Home
                Screen&rdquo; or &ldquo;Install app&rdquo;.
              </p>
            )}
          </>
        )}

        <div className="mt-6">
          {showAndroidPrompt ? (
            <button
              type="button"
              onClick={dismiss}
              className="btn-outline w-full text-sm"
            >
              Continue in browser
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="btn-primary w-full text-sm"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
