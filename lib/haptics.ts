"use client";

function canVibrate(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.vibrate === "function";
}

export function tap(): void {
  if (canVibrate()) navigator.vibrate(10);
}

export function success(): void {
  if (canVibrate()) navigator.vibrate([15, 40, 15]);
}

export function warning(): void {
  if (canVibrate()) navigator.vibrate([30, 50, 30]);
}
