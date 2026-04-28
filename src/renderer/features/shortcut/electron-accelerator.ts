import type { Hotkey } from "@tanstack/react-hotkeys";

const ELECTRON_ACCELERATOR_TOKENS: Record<string, string> = {
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  Escape: "Esc",
  Meta: "Command",
  Mod: "CommandOrControl",
};

export function toElectronAccelerator(shortcut: Hotkey): string {
  return shortcut
    .split("+")
    .map((token) => ELECTRON_ACCELERATOR_TOKENS[token] ?? token)
    .join("+");
}
