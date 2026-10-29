"use client";
export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
let prompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();
export const installSnapshot = () => prompt;
export const serverInstallSnapshot = () => null;
export const listenInstall = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export function setInstallPrompt(value: InstallPrompt | null) {
  prompt = value;
  listeners.forEach((fn) => fn());
}
export function orderPushDevice() {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { ios, installed };
}
