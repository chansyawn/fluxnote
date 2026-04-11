import { useEffect, useState } from "react";

import type { ShortcutInputError } from "@/features/shortcut/shortcut-input";
import {
  getShortcutFromKeyboardEvent,
  getShortcutPreviewTokens,
  type ShortcutAction,
} from "@/features/shortcut/shortcut-utils";

interface ShortcutUpdateResult {
  ok: boolean;
  error?: ShortcutInputError;
}

interface UseShortcutRecorderParams {
  updateShortcut: (action: ShortcutAction, shortcut: string) => ShortcutUpdateResult;
}

interface UseShortcutRecorderResult {
  recordingAction: ShortcutAction | null;
  recordingPreviewTokens: string[];
  fieldErrors: Partial<Record<ShortcutAction, ShortcutInputError>>;
  clearFieldError: (action: ShortcutAction) => void;
  setRecordingAction: (
    updater: ShortcutAction | null | ((current: ShortcutAction | null) => ShortcutAction | null),
  ) => void;
}

export function useShortcutRecorder({
  updateShortcut,
}: UseShortcutRecorderParams): UseShortcutRecorderResult {
  const [recordingAction, setRecordingActionState] = useState<ShortcutAction | null>(null);
  const [recordingPreviewTokens, setRecordingPreviewTokens] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ShortcutAction, ShortcutInputError>>
  >({});

  useEffect(() => {
    if (!recordingAction) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      setRecordingPreviewTokens(getShortcutPreviewTokens(event));

      if (event.key === "Escape") {
        event.preventDefault();
        setRecordingActionState(null);
        setRecordingPreviewTokens([]);
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [recordingAction]: undefined,
        }));
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const capturedShortcut = getShortcutFromKeyboardEvent(event);

      if (!capturedShortcut) {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [recordingAction]: "invalid",
        }));
        return;
      }

      const result = updateShortcut(recordingAction, capturedShortcut);

      if (!result.ok) {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [recordingAction]: result.error,
        }));
        return;
      }

      setRecordingActionState(null);
      setRecordingPreviewTokens([]);
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [recordingAction]: undefined,
      }));
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [recordingAction, updateShortcut]);

  return {
    recordingAction,
    recordingPreviewTokens,
    fieldErrors,
    clearFieldError: (action) => {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [action]: undefined,
      }));
    },
    setRecordingAction: (updater) => {
      if (typeof updater === "function") {
        setRecordingActionState((currentAction) => {
          const nextAction = (updater as (current: ShortcutAction | null) => ShortcutAction | null)(
            currentAction,
          );
          setRecordingPreviewTokens([]);
          return nextAction;
        });
        return;
      }

      setRecordingPreviewTokens([]);
      setRecordingActionState(updater);
    },
  };
}
