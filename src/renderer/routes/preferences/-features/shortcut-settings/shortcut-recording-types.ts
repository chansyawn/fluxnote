import type { ShortcutUpdateError } from "@renderer/features/shortcut/shortcut-utils";

export type ShortcutInputError = ShortcutUpdateError | "unavailable";
export type ShortcutRecordingPhase = "recording" | "error" | "success";

export interface ShortcutRecordingState {
  phase: ShortcutRecordingPhase;
  tokens: string[];
  error: ShortcutInputError | null;
}
