"use client";

import { useAuth } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";

export default function AdminViewToggle() {
  const { isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdminPage = pathname === "/admin";

  if (!isAdmin) return null;

  return (
    <div className="relative flex items-center bg-bg2 border border-brd rounded-pill p-0.5 text-[10px] w-[84px]">
      {/* Sliding background indicator */}
      <div
        className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-txt rounded-pill transition-transform duration-200 ease-out"
        style={{
          transform: isAdminPage
            ? "translateX(calc(100% + 4px))"
            : "translateX(0)",
        }}
      />

      {/* Buttons */}
      <button
        onClick={() => router.push("/")}
        className={`relative z-10 px-1.5 py-0.5 rounded-pill transition-colors duration-200 flex-1 ${
          !isAdminPage ? "text-bg font-medium" : "text-txt2"
        }`}
      >
        Public
      </button>
      <button
        onClick={() => router.push("/admin")}
        className={`relative z-10 px-1.5 py-0.5 rounded-pill transition-colors duration-200 flex-1 ${
          isAdminPage ? "text-bg font-medium" : "text-txt2"
        }`}
      >
        Admin
      </button>
    </div>
  );
}
