"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import RequestAccessModal from "./RequestAccessModal";
import BugReportModal from "./BugReportModal";

export default function AdminButton() {
  const { isAdmin, isSuperuser, user, signOut, avatarUrl } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null,
  );
  const pathname = usePathname();
  const isAdminPage = pathname === "/admin";
  const [avatarLoaded, setAvatarLoaded] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageError = () => {
    setAvatarLoaded(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setShowMenu(false);
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) return;
    function updateAnchor() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [showMenu]);

  // Before mount, render a neutral placeholder to avoid hydration mismatch
  // (auth state is only known on the client)
  if (!mounted) {
    return (
      <div
        aria-hidden
        className="w-9 h-9 rounded-full border border-brd bg-bg opacity-30"
      />
    );
  }

  // Not logged in
  if (!user) {
    return (
      <a
        href="/login"
        aria-label="Login"
        className="w-9 h-9 flex items-center justify-center rounded-full border border-brd bg-bg text-txt2 hover:text-txt transition-colors duration-150 no-underline"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </a>
    );
  }

  // Logged in (admin or regular user)
  const menu =
    showMenu && anchor ? (
      <div
        ref={menuRef}
        style={{ top: anchor.top, right: anchor.right }}
        className="fixed bg-bg border-[1.5px] border-brd rounded-md shadow-lg min-w-[140px] z-[1000]"
      >
        {isAdmin && (
          <>
            <a
              href="/admin/restaurants"
              className="block w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 no-underline transition-colors"
              onClick={() => setShowMenu(false)}
            >
              Bulk Restaurants
            </a>
            <a
              href="/admin/bugs"
              className="block w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 no-underline transition-colors"
              onClick={() => setShowMenu(false)}
            >
              View Bugs
            </a>
          </>
        )}
        {isSuperuser && (
          <>
            <a
              href="/admin/users"
              className="block w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 no-underline transition-colors"
              onClick={() => setShowMenu(false)}
            >
              Manage Users
            </a>
            <a
              href="/admin/stats"
              className="block w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 no-underline transition-colors"
              onClick={() => setShowMenu(false)}
            >
              Site Stats
            </a>
            <a
              href="/admin/boba"
              className="block w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 no-underline transition-colors"
              onClick={() => setShowMenu(false)}
            >
              Boba Analytics
            </a>
          </>
        )}
        {!isAdmin && (
          <button
            onClick={() => {
              setShowRequestModal(true);
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 cursor-pointer bg-transparent border-none font-body transition-colors"
          >
            Request access
          </button>
        )}
        <button
          onClick={() => {
            setShowBugModal(true);
            setShowMenu(false);
          }}
          className="w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 cursor-pointer bg-transparent border-none font-body transition-colors"
        >
          Make suggestion / report bug
        </button>
        <button
          onClick={async () => {
            await signOut();
            setShowMenu(false);
            window.location.href = "/";
          }}
          className="w-full text-left px-4 py-2.5 text-sm text-accent hover:bg-brd/20 cursor-pointer bg-transparent border-none font-body transition-colors"
        >
          Logout
        </button>
      </div>
    ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        aria-label={isAdmin ? "Admin menu" : "User menu"}
        className={`w-9 h-9 flex items-center justify-center rounded-full border hover:opacity-90 transition-opacity duration-150 text-sm font-medium overflow-hidden ${
          isAdmin ? "border-accent" : "border-txt"
        }`}
      >
        {avatarUrl && avatarLoaded ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={handleImageError}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        ) : (
          <span
            className={`text-white ${isAdmin ? "bg-accent" : "bg-txt"} w-full h-full flex items-center justify-center`}
          >
            {isAdmin ? "A" : "U"}
          </span>
        )}
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
      {showRequestModal && (
        <RequestAccessModal onClose={() => setShowRequestModal(false)} />
      )}
      {showBugModal && (
        <BugReportModal onClose={() => setShowBugModal(false)} />
      )}
    </div>
  );
}
