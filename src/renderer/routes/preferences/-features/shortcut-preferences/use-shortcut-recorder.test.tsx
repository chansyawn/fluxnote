// @vitest-environment jsdom

import {
  formatShortcutRecorderTokens,
  formatShortcutTokens,
  normalizeShortcutRecorderHotkey,
} from "@renderer/features/shortcut/shortcut-utils";
import { dispatchDocumentKeyboardEvent } from "@renderer/test/events";
import { renderWithProviders } from "@renderer/test/render";
import type { ShortcutAction } from "@shared/features/preferences/user-preferences";
import type { Hotkey } from "@tanstack/react-hotkeys";
import { act, useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { ShortcutInputError, ShortcutRecordingState } from "./shortcut-recording-types";
import { useShortcutRecorder } from "./use-shortcut-recorder";

type ShortcutUpdateResult =
  | { ok: true; shortcut: Hotkey }
  | { ok: false; error?: ShortcutInputError };

type RecorderSnapshot = {
  cancelRecording: () => void;
  clearFieldError: (action: ShortcutAction) => void;
  feedback: ShortcutRecordingState | null;
  fieldErrors: Partial<Record<ShortcutAction, ShortcutInputError>>;
  recordingAction: ShortcutAction | null;
  startRecording: (action: ShortcutAction) => void;
};

type UpdateShortcut = (action: ShortcutAction, shortcut: string) => ShortcutUpdateResult;

function RecorderHarness({
  clearShortcut,
  onSnapshot,
  updateShortcut,
}: {
  clearShortcut: (action: ShortcutAction) => void;
  onSnapshot: (snapshot: RecorderSnapshot) => void;
  updateShortcut: UpdateShortcut;
}) {
  const recorder = useShortcutRecorder({ clearShortcut, updateShortcut });

  useLayoutEffect(() => {
    onSnapshot(recorder);
  });

  return null;
}

function createRecorderHarness(
  options: {
    clearShortcut?: (action: ShortcutAction) => void;
    updateShortcut?: UpdateShortcut;
  } = {},
) {
  let snapshot: RecorderSnapshot | null = null;
  const clearShortcut = options.clearShortcut ?? vi.fn();
  const updateShortcut =
    options.updateShortcut ??
    vi.fn<UpdateShortcut>(
      (_action, shortcut) => ({ ok: true, shortcut: shortcut as Hotkey }) as const,
    );

  const rendered = renderWithProviders(
    <RecorderHarness
      clearShortcut={clearShortcut}
      updateShortcut={updateShortcut}
      onSnapshot={(nextSnapshot) => {
        snapshot = nextSnapshot;
      }}
    />,
  );

  return {
    clearShortcut,
    getSnapshot(): RecorderSnapshot {
      if (!snapshot) {
        throw new Error("Shortcut recorder snapshot is unavailable.");
      }
      return snapshot;
    },
    updateShortcut,
    ...rendered,
  };
}

describe("useShortcutRecorder", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("previews modifier keys and resumes recording after duplicate shortcut feedback", () => {
    vi.useFakeTimers();
    const updateShortcut = vi.fn<UpdateShortcut>(
      () => ({ ok: false, error: "duplicate" }) as const,
    );
    const harness = createRecorderHarness({ updateShortcut });

    act(() => {
      harness.getSnapshot().startRecording("workspace.createBlock");
    });

    let controlDownEvent: KeyboardEvent;
    act(() => {
      controlDownEvent = dispatchDocumentKeyboardEvent("keydown", {
        ctrlKey: true,
        key: "Control",
      });
    });

    expect(harness.getSnapshot().feedback).toEqual({
      error: null,
      phase: "recording",
      tokens: formatShortcutRecorderTokens(controlDownEvent!),
    });

    let duplicateEvent: KeyboardEvent;
    act(() => {
      duplicateEvent = dispatchDocumentKeyboardEvent("keydown", {
        ctrlKey: true,
        key: "k",
      });
    });
    const duplicateHotkey = normalizeShortcutRecorderHotkey(duplicateEvent!);

    if (!duplicateHotkey) {
      throw new Error("Expected the duplicate shortcut to normalize.");
    }

    expect(harness.getSnapshot().feedback).toEqual({
      error: "duplicate",
      phase: "error",
      tokens: formatShortcutTokens(duplicateHotkey),
    });
    expect(harness.getSnapshot().fieldErrors["workspace.createBlock"]).toBe("duplicate");

    act(() => {
      vi.advanceTimersByTime(1_800);
    });

    expect(harness.getSnapshot().feedback).toEqual({
      error: null,
      phase: "recording",
      tokens: [],
    });
    expect(harness.getSnapshot().fieldErrors["workspace.createBlock"]).toBeUndefined();

    let resumedEvent: KeyboardEvent;
    act(() => {
      resumedEvent = dispatchDocumentKeyboardEvent("keydown", {
        ctrlKey: true,
        key: "Control",
      });
    });

    expect(harness.getSnapshot().feedback).toEqual({
      error: null,
      phase: "recording",
      tokens: formatShortcutRecorderTokens(resumedEvent!),
    });
  });

  it("records a valid shortcut and closes after success feedback", () => {
    vi.useFakeTimers();
    const updateShortcut = vi.fn<UpdateShortcut>(
      (_action, shortcut) => ({ ok: true, shortcut: shortcut as Hotkey }) as const,
    );
    const harness = createRecorderHarness({ updateShortcut });

    act(() => {
      harness.getSnapshot().startRecording("workspace.createBlock");
    });

    let recordedEvent: KeyboardEvent;
    act(() => {
      recordedEvent = dispatchDocumentKeyboardEvent("keydown", {
        ctrlKey: true,
        key: "k",
        shiftKey: true,
      });
    });
    const recordedHotkey = normalizeShortcutRecorderHotkey(recordedEvent!);

    if (!recordedHotkey) {
      throw new Error("Expected the recorded shortcut to normalize.");
    }

    expect(updateShortcut).toHaveBeenCalledWith("workspace.createBlock", recordedHotkey);
    expect(harness.getSnapshot().feedback).toEqual({
      error: null,
      phase: "success",
      tokens: formatShortcutTokens(recordedHotkey),
    });

    act(() => {
      vi.advanceTimersByTime(1_200);
    });

    expect(harness.getSnapshot().feedback).toBeNull();
    expect(harness.getSnapshot().recordingAction).toBeNull();
  });

  it("lets the user clear or cancel a Shortcut Preference recording", () => {
    vi.useFakeTimers();
    const clearShortcut = vi.fn();
    const harness = createRecorderHarness({ clearShortcut });

    act(() => {
      harness.getSnapshot().startRecording("workspace.createBlock");
    });
    act(() => {
      dispatchDocumentKeyboardEvent("keydown", { key: "Backspace" });
    });

    expect(clearShortcut).toHaveBeenCalledWith("workspace.createBlock");
    expect(harness.getSnapshot().feedback?.phase).toBe("success");

    act(() => {
      vi.advanceTimersByTime(1_200);
      harness.getSnapshot().startRecording("workspace.archiveBlock");
    });

    act(() => {
      dispatchDocumentKeyboardEvent("keydown", { key: "Escape" });
    });

    expect(harness.getSnapshot().feedback).toBeNull();
    expect(harness.getSnapshot().recordingAction).toBeNull();
  });
});
