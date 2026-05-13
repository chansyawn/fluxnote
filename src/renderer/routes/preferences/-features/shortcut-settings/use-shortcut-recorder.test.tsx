// @vitest-environment jsdom

import {
  formatShortcutRecorderTokens,
  formatShortcutTokens,
  normalizeShortcutRecorderHotkey,
} from "@renderer/features/shortcut/shortcut-utils";
import type { ShortcutAction } from "@shared/features/preferences/settings";
import type { Hotkey } from "@tanstack/react-hotkeys";
import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { ShortcutInputError, ShortcutRecordingState } from "./shortcut-recording-types";
import { useShortcutRecorder } from "./use-shortcut-recorder";

interface RecorderSnapshot {
  recordingAction: ShortcutAction | null;
  feedback: ShortcutRecordingState | null;
  fieldErrors: Partial<Record<ShortcutAction, ShortcutInputError>>;
  startRecording: (action: ShortcutAction) => void;
  cancelRecording: () => void;
}

interface RecorderHarnessProps {
  clearShortcut: (action: ShortcutAction) => void;
  onSnapshot: (snapshot: RecorderSnapshot) => void;
  updateShortcut: (
    action: ShortcutAction,
    shortcut: string,
  ) =>
    | {
        ok: true;
        shortcut: Hotkey;
      }
    | {
        ok: false;
        error?: ShortcutInputError;
      };
}

type UpdateShortcutHandler = RecorderHarnessProps["updateShortcut"];

function RecorderHarness({ clearShortcut, onSnapshot, updateShortcut }: RecorderHarnessProps) {
  const recorder = useShortcutRecorder({ clearShortcut, updateShortcut });

  useLayoutEffect(() => {
    onSnapshot(recorder);
  });

  return null;
}

function dispatchKeyboardEvent(type: "keydown" | "keyup", init: KeyboardEventInit): void {
  document.dispatchEvent(
    new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

function createHarness(options?: {
  clearShortcut?: (action: ShortcutAction) => void;
  updateShortcut?: UpdateShortcutHandler;
}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let snapshot: RecorderSnapshot | null = null;
  const clearShortcut = options?.clearShortcut ?? vi.fn();
  const updateShortcutMock =
    options?.updateShortcut ??
    vi.fn<UpdateShortcutHandler>(
      (_action: ShortcutAction, shortcut: string) =>
        ({ ok: true, shortcut: shortcut as Hotkey }) as const,
    );
  const updateShortcut: UpdateShortcutHandler = (action, shortcut) =>
    updateShortcutMock(action, shortcut);

  act(() => {
    root.render(
      <RecorderHarness
        clearShortcut={clearShortcut}
        onSnapshot={(nextSnapshot) => {
          snapshot = nextSnapshot;
        }}
        updateShortcut={updateShortcut}
      />,
    );
  });

  return {
    clearShortcut,
    getSnapshot(): RecorderSnapshot {
      if (!snapshot) {
        throw new Error("Recorder snapshot is unavailable.");
      }

      return snapshot;
    },
    unmount(): void {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useShortcutRecorder", () => {
  let mountedRoot: { unmount: () => void } | null = null;

  afterEach(() => {
    vi.useRealTimers();
    mountedRoot?.unmount();
    mountedRoot = null;
  });

  it("shows live modifier previews and resumes recording after validation errors", () => {
    vi.useFakeTimers();
    const updateShortcutMock = vi.fn<UpdateShortcutHandler>(
      () =>
        ({
          ok: false,
          error: "duplicate" as const,
        }) as const,
    );
    const harness = createHarness({
      updateShortcut: (action, shortcut) => updateShortcutMock(action, shortcut),
    });
    mountedRoot = harness;

    act(() => {
      harness.getSnapshot().startRecording("create-block");
    });

    const controlDownEvent = {
      altKey: false,
      ctrlKey: true,
      key: "Control",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent;

    act(() => {
      dispatchKeyboardEvent("keydown", controlDownEvent);
    });

    expect(harness.getSnapshot().feedback).toEqual({
      error: null,
      phase: "recording",
      tokens: formatShortcutRecorderTokens(controlDownEvent),
    });

    const duplicateEvent = {
      altKey: false,
      ctrlKey: true,
      key: "k",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent;
    const duplicateHotkey = normalizeShortcutRecorderHotkey(duplicateEvent);

    if (!duplicateHotkey) {
      throw new Error("Expected a normalized duplicate hotkey.");
    }

    act(() => {
      dispatchKeyboardEvent("keydown", duplicateEvent);
    });

    expect(harness.getSnapshot().feedback).toEqual({
      error: "duplicate",
      phase: "error",
      tokens: formatShortcutTokens(duplicateHotkey),
    });
    expect(harness.getSnapshot().fieldErrors["create-block"]).toBe("duplicate");

    act(() => {
      vi.advanceTimersByTime(1_800);
    });

    expect(harness.getSnapshot().feedback).toEqual({
      error: null,
      phase: "recording",
      tokens: [],
    });
    expect(harness.getSnapshot().fieldErrors["create-block"]).toBeUndefined();

    act(() => {
      dispatchKeyboardEvent("keydown", controlDownEvent);
    });

    expect(harness.getSnapshot().feedback).toEqual({
      error: null,
      phase: "recording",
      tokens: formatShortcutRecorderTokens(controlDownEvent),
    });
  });

  it("records a valid shortcut and closes after the success timeout", () => {
    vi.useFakeTimers();
    const updateShortcutMock = vi.fn<UpdateShortcutHandler>(
      (_action: ShortcutAction, shortcut: string) =>
        ({
          ok: true,
          shortcut: shortcut as Hotkey,
        }) as const,
    );
    const harness = createHarness({
      updateShortcut: (action, shortcut) => updateShortcutMock(action, shortcut),
    });
    mountedRoot = harness;

    act(() => {
      harness.getSnapshot().startRecording("create-block");
    });

    const recordedEvent = {
      altKey: false,
      ctrlKey: true,
      key: "k",
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent;
    const recordedHotkey = normalizeShortcutRecorderHotkey(recordedEvent);

    if (!recordedHotkey) {
      throw new Error("Expected a normalized hotkey.");
    }

    act(() => {
      dispatchKeyboardEvent("keydown", recordedEvent);
    });

    expect(updateShortcutMock).toHaveBeenCalledWith("create-block", recordedHotkey);
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
});
