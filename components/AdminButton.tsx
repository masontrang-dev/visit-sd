"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";

export default function AdminButton() {
  const { isAdmin, user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isAdminPage = pathname === "/admin";

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
        className={`w-9 h-9 flex items-center justify-center rounded-full border text-white hover:opacity-90 transition-opacity duration-150 text-sm font-medium ${
          isAdmin ? "border-accent bg-accent" : "border-txt bg-txt"
        }`}
      >
        {isAdmin ? "A" : "U"}
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-bg border-[1.5px] border-brd rounded-md shadow-lg min-w-[120px] z-50">
          {isAdmin && (
            <a
              href="/admin"
              className="block w-full text-left px-4 py-2.5 text-sm text-txt hover:bg-brd/20 no-underline transition-colors"
              onClick={() => setShowMenu(false)}
            >
              Admin Panel
            </a>
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
    </div>
  );
}
