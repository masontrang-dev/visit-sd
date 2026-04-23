"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Size = "sm" | "md" | "lg";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: Size;
  ariaLabel?: string;
  closeOnBackdrop?: boolean;
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "max-w-[360px]",
  md: "max-w-[480px]",
  lg: "max-w-[640px]",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  children,
  size = "md",
  ariaLabel,
  closeOnBackdrop = true,
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first focusable element in the modal surface on open
    const focusFirst = () => {
      const node = surfaceRef.current;
      if (!node) return;
      const focusable = node.querySelectorAll<HTMLElement>(FOCUSABLE);
      (focusable[0] ?? node).focus();
    };
    const id = window.setTimeout(focusFirst, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const node = surfaceRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      const toRestore = lastFocusedRef.current;
      if (toRestore && document.contains(toRestore)) {
        toRestore.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-overlay-bg backdrop-blur-sm flex items-center justify-center p-4 motion-safe:animate-backdrop-in"
    >
      <div
        ref={surfaceRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${SIZE_CLASS[size]} max-h-[90vh] overflow-y-auto overflow-x-hidden bg-bg border-[1.5px] border-txt shadow-xl outline-none motion-safe:animate-modal-in`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

type HeaderProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
};

export function ModalHeader({ title, subtitle, onClose }: HeaderProps) {
  return (
    <div className="sticky top-0 bg-bg z-20 px-6 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-brd">
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none tracking-tight">
          {title}
        </p>
        {subtitle && <p className="text-txt2 text-sm mt-1">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 w-11 h-11 -mr-2 -mt-1 inline-flex items-center justify-center text-txt2 hover:text-txt focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-none transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
