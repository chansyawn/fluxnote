import type { Hotkey } from "@fluxnotes/shared/shortcuts";
import {
  formatShortcutRecorderTokens,
  formatShortcutTokens,
  normalizeShortcutRecorderHotkey,
} from "@renderer/features/shortcut/shortcut-utils";
import type { ShortcutAction } from "@shared/features/preferences/user-preferences";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ShortcutInputError, ShortcutRecordingState } from "./shortcut-recording-types";

const ERROR_FEEDBACK_DURATION_MS = 1_800;
const SUCCESS_FEEDBACK_DURATION_MS = 1_200;

type ShortcutUpdateResult =
  | { ok: true; shortcut: Hotkey }
  | { ok: false; error?: ShortcutInputError };

interface UseShortcutRecorderParams {
  clearShortcut: (action: ShortcutAction) => void;
  updateShortcut: (action: ShortcutAction, shortcut: string) => ShortcutUpdateResult;
}

interface UseShortcutRecorderResult {
  recordingAction: ShortcutAction | null;
  feedback: ShortcutRecordingState | null;
  fieldErrors: Partial<Record<ShortcutAction, ShortcutInputError>>;
  clearFieldError: (action: ShortcutAction) => void;
  startRecording: (action: ShortcutAction) => void;
  cancelRecording: () => void;
}

function createRecordingState(
  phase: ShortcutRecordingState["phase"],
  tokens: string[] = [],
  error: ShortcutInputError | null = null,
): ShortcutRecordingState {
  return { phase, tokens, error };
}

export function useShortcutRecorder({
  clearShortcut,
  updateShortcut,
}: UseShortcutRecorderParams): UseShortcutRecorderResult {
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);
  const [feedback, setFeedback] = useState<ShortcutRecordingState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ShortcutAction, ShortcutInputError>>
  >({});
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingActionRef = useRef<ShortcutAction | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const startListeningRef = useRef<() => void>(() => {});

  const stopListening = useCallback(() => {
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
  }, []);

  const clearFeedbackTimer = useCallback(() => {
    if (!feedbackTimerRef.current) {
      return;
    }

    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
  }, []);

  const finishRecording = useCallback(() => {
    stopListening();
    recordingActionRef.current = null;
    setRecordingAction(null);
    setFeedback(null);
  }, [stopListening]);

  const startListening = useCallback(() => {
    stopListening();

    const handleKeyDown = (event: KeyboardEvent) => {
      const action = recordingActionRef.current;

      if (!action || event.repeat) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        clearFeedbackTimer();
        finishRecording();
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        stopListening();
        clearShortcut(action);
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [action]: undefined,
        }));
        setFeedback(createRecordingState("success"));

        feedbackTimerRef.current = setTimeout(() => {
          finishRecording();
          feedbackTimerRef.current = null;
        }, SUCCESS_FEEDBACK_DURATION_MS);
        return;
      }

      const hotkey = normalizeShortcutRecorderHotkey(event);
      const tokens = formatShortcutRecorderTokens(event);

      if (!hotkey) {
        setFeedback(createRecordingState("recording", tokens));
        return;
      }

      stopListening();

      const result = updateShortcut(action, hotkey);
      const recordedTokens = formatShortcutTokens(result.ok ? result.shortcut : hotkey);

      if (!result.ok) {
        clearFeedbackTimer();
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [action]: result.error ?? "invalid",
        }));
        setFeedback(createRecordingState("error", recordedTokens, result.error ?? "invalid"));

        feedbackTimerRef.current = setTimeout(() => {
          if (recordingActionRef.current !== action) {
            feedbackTimerRef.current = null;
            return;
          }

          setFieldErrors((currentErrors) => ({
            ...currentErrors,
            [action]: undefined,
          }));
          setFeedback(createRecordingState("recording"));
          startListeningRef.current();
          feedbackTimerRef.current = null;
        }, ERROR_FEEDBACK_DURATION_MS);
        return;
      }

      clearFeedbackTimer();
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [action]: undefined,
      }));
      setFeedback(createRecordingState("success", recordedTokens));

      feedbackTimerRef.current = setTimeout(() => {
        finishRecording();
        feedbackTimerRef.current = null;
      }, SUCCESS_FEEDBACK_DURATION_MS);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!recordingActionRef.current) {
        return;
      }

      setFeedback((currentFeedback) => {
        if (!currentFeedback || currentFeedback.phase !== "recording") {
          return currentFeedback;
        }

        return createRecordingState("recording", formatShortcutRecorderTokens(event));
      });
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    listenerCleanupRef.current = () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [clearFeedbackTimer, clearShortcut, finishRecording, stopListening, updateShortcut]);

  startListeningRef.current = startListening;

  const cancelRecording = useCallback(() => {
    clearFeedbackTimer();
    finishRecording();
  }, [clearFeedbackTimer, finishRecording]);

  const startRecording = useCallback(
    (action: ShortcutAction) => {
      clearFeedbackTimer();
      finishRecording();
      recordingActionRef.current = action;
      setRecordingAction(action);
      setFeedback(createRecordingState("recording"));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [action]: undefined,
      }));
      startListening();
    },
    [clearFeedbackTimer, finishRecording, startListening],
  );

  useEffect(
    () => () => {
      clearFeedbackTimer();
      stopListening();
    },
    [clearFeedbackTimer, stopListening],
  );

  return {
    recordingAction,
    feedback,
    fieldErrors,
    clearFieldError: (action) => {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [action]: undefined,
      }));
    },
    startRecording,
    cancelRecording,
  };
}
