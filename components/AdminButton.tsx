"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import RequestAccessModal from "./RequestAccessModal";

export default function AdminButton() {
  const { isAdmin, isSuperuser, user, signOut, avatarUrl } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
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
        className="w-9 h-9 flex items-center justify-center rounded-full border border-brd bg-bg text-txt2 opacity-30 hover:opacity-60 transition-opacity duration-150 text-lg no-underline"
      >
        ⚙
      </a>
    );
  }

  // Logged in (admin or regular user)
  return (
    <div className="relative" ref={menuRef}>
      <button
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
      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-bg border-[1.5px] border-brd rounded-md shadow-lg min-w-[140px] z-50">
          {isSuperuser && (
            <a
              href="/admin/users"
              className="block w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 no-underline transition-colors"
              onClick={() => setShowMenu(false)}
            >
              Manage Users
            </a>
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
      )}
      {showRequestModal && (
        <RequestAccessModal onClose={() => setShowRequestModal(false)} />
      )}
    </div>
  );
}
