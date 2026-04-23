"use client";

import Modal from "./Modal";

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
  return (
    <Modal open onClose={onCancel} size="sm" ariaLabel={title}>
      <div className="p-6">
        <p className="font-display text-2xl mb-4 tracking-tight">{title}</p>
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
    </Modal>
  );
}
