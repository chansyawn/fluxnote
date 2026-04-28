import type { ShortcutAction } from "@renderer/app/preferences/preferences-schema";
import {
  getShortcutFromKeyboardEvent,
  getShortcutPreviewTokens,
} from "@renderer/features/shortcut/shortcut-utils";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ShortcutInputError, ShortcutRecordingFeedback } from "./shortcut-recording-types";

const ERROR_FEEDBACK_DURATION_MS = 1_800;
const SUCCESS_FEEDBACK_DURATION_MS = 1_200;

interface ShortcutUpdateResult {
  ok: boolean;
  error?: ShortcutInputError;
}

interface UseShortcutRecorderParams {
  updateShortcut: (action: ShortcutAction, shortcut: string) => ShortcutUpdateResult;
}

interface UseShortcutRecorderResult {
  recordingAction: ShortcutAction | null;
  feedback: ShortcutRecordingFeedback | null;
  fieldErrors: Partial<Record<ShortcutAction, ShortcutInputError>>;
  clearFieldError: (action: ShortcutAction) => void;
  startRecording: (action: ShortcutAction) => void;
  cancelRecording: () => void;
}

export function useShortcutRecorder({
  updateShortcut,
}: UseShortcutRecorderParams): UseShortcutRecorderResult {
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);
  const [feedback, setFeedback] = useState<ShortcutRecordingFeedback | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ShortcutAction, ShortcutInputError>>
  >({});
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedbackTimer = useCallback(() => {
    if (!feedbackTimerRef.current) {
      return;
    }

    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
  }, []);

  const cancelRecording = useCallback(() => {
    clearFeedbackTimer();
    setRecordingAction(null);
    setFeedback(null);
  }, [clearFeedbackTimer]);

  const startRecording = useCallback(
    (action: ShortcutAction) => {
      clearFeedbackTimer();
      setRecordingAction(action);
      setFeedback({ phase: "recording", tokens: [], error: null });
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [action]: undefined,
      }));
    },
    [clearFeedbackTimer],
  );

  const showErrorFeedback = useCallback(
    (action: ShortcutAction, tokens: string[], error: ShortcutInputError) => {
      clearFeedbackTimer();
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [action]: error,
      }));
      setFeedback({ phase: "error", tokens, error });

      feedbackTimerRef.current = setTimeout(() => {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [action]: undefined,
        }));
        setFeedback({ phase: "recording", tokens: [], error: null });
        feedbackTimerRef.current = null;
      }, ERROR_FEEDBACK_DURATION_MS);
    },
    [clearFeedbackTimer],
  );

  const showSuccessFeedback = useCallback(
    (action: ShortcutAction, tokens: string[]) => {
      clearFeedbackTimer();
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [action]: undefined,
      }));
      setFeedback({ phase: "success", tokens, error: null });

      feedbackTimerRef.current = setTimeout(() => {
        setRecordingAction(null);
        setFeedback(null);
        feedbackTimerRef.current = null;
      }, SUCCESS_FEEDBACK_DURATION_MS);
    },
    [clearFeedbackTimer],
  );

  useEffect(() => {
    if (!recordingAction) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelRecording();
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const previewTokens = getShortcutPreviewTokens(event);
      const capturedShortcut = getShortcutFromKeyboardEvent(event);

      if (!capturedShortcut) {
        showErrorFeedback(recordingAction, previewTokens, "invalid");
        return;
      }

      const result = updateShortcut(recordingAction, capturedShortcut);

      if (!result.ok) {
        showErrorFeedback(recordingAction, previewTokens, result.error ?? "invalid");
        return;
      }

      showSuccessFeedback(recordingAction, previewTokens);
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [cancelRecording, recordingAction, showErrorFeedback, showSuccessFeedback, updateShortcut]);

  useEffect(
    () => () => {
      clearFeedbackTimer();
    },
    [clearFeedbackTimer],
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
