"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="fixed inset-0 bg-black/55 z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-bg border-2 border-txt p-6 w-full max-w-[400px]">
        <p className="font-display text-2xl mb-4">{title}</p>
        <p className="text-base text-txt mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-outline flex-1">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="btn-primary flex-1">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
