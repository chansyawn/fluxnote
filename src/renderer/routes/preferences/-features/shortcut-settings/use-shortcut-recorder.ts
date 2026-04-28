import type { ShortcutAction } from "@renderer/app/preferences/preferences-schema";
import { formatShortcutTokens } from "@renderer/features/shortcut/shortcut-utils";
import { useHotkeyRecorder, type Hotkey } from "@tanstack/react-hotkeys";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ShortcutInputError, ShortcutRecordingFeedback } from "./shortcut-recording-types";

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
  feedback: ShortcutRecordingFeedback | null;
  fieldErrors: Partial<Record<ShortcutAction, ShortcutInputError>>;
  clearFieldError: (action: ShortcutAction) => void;
  startRecording: (action: ShortcutAction) => void;
  cancelRecording: () => void;
}

export function useShortcutRecorder({
  clearShortcut,
  updateShortcut,
}: UseShortcutRecorderParams): UseShortcutRecorderResult {
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);
  const [feedback, setFeedback] = useState<ShortcutRecordingFeedback | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ShortcutAction, ShortcutInputError>>
  >({});
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingActionRef = useRef<ShortcutAction | null>(null);

  const clearFeedbackTimer = useCallback(() => {
    if (!feedbackTimerRef.current) {
      return;
    }

    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
  }, []);

  const finishRecording = useCallback(() => {
    recordingActionRef.current = null;
    setRecordingAction(null);
    setFeedback(null);
  }, []);

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
        finishRecording();
        feedbackTimerRef.current = null;
      }, SUCCESS_FEEDBACK_DURATION_MS);
    },
    [clearFeedbackTimer, finishRecording],
  );

  const recorder = useHotkeyRecorder({
    ignoreInputs: false,
    onCancel: finishRecording,
    onClear: () => {
      const action = recordingActionRef.current;

      if (!action) {
        return;
      }

      clearShortcut(action);
      showSuccessFeedback(action, []);
    },
    onRecord: (hotkey) => {
      const action = recordingActionRef.current;

      if (!action || !hotkey) {
        return;
      }

      const result = updateShortcut(action, hotkey);
      const tokens = formatShortcutTokens(result.ok ? result.shortcut : hotkey);

      if (!result.ok) {
        showErrorFeedback(action, tokens, result.error ?? "invalid");
        return;
      }

      showSuccessFeedback(action, tokens);
    },
  });

  const cancelRecording = useCallback(() => {
    clearFeedbackTimer();
    recorder.cancelRecording();
    finishRecording();
  }, [clearFeedbackTimer, finishRecording, recorder]);

  const startRecording = useCallback(
    (action: ShortcutAction) => {
      clearFeedbackTimer();
      recorder.stopRecording();
      recordingActionRef.current = action;
      setRecordingAction(action);
      setFeedback({ phase: "recording", tokens: [], error: null });
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [action]: undefined,
      }));
      recorder.startRecording();
    },
    [clearFeedbackTimer, recorder],
  );

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
