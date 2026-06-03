// @vitest-environment jsdom

import { DEFAULT_BLOCK_EDITOR_ACTION_STATE } from "@fluxnotes/editor";
import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";
import type { BlockEditorRegistry } from "./use-block-editor-registry";
import { useBlockEditorRegistry } from "./use-block-editor-registry";

function createEditorHandle(): WorkspaceBlockEditorHandle {
  return {
    copy: vi.fn(async () => undefined),
    executeAction: vi.fn((action) => ({
      action,
      focus: "editor" as const,
      status: "executed" as const,
    })),
    flush: vi.fn(async () => ""),
    focus: vi.fn(),
    getActionState: () => DEFAULT_BLOCK_EDITOR_ACTION_STATE,
    subscribeActionState: () => () => undefined,
  };
}

function RegistryHarness({ onSnapshot }: { onSnapshot: (snapshot: BlockEditorRegistry) => void }) {
  const registry = useBlockEditorRegistry();

  useLayoutEffect(() => {
    onSnapshot(registry);
  });

  return null;
}

function createHarness() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let snapshot: BlockEditorRegistry | null = null;

  act(() => {
    root.render(
      <RegistryHarness
        onSnapshot={(nextSnapshot) => {
          snapshot = nextSnapshot;
        }}
      />,
    );
  });

  return {
    getSnapshot(): BlockEditorRegistry {
      if (!snapshot) {
        throw new Error("Block editor registry snapshot is unavailable.");
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

describe("useBlockEditorRegistry", () => {
  let mountedRoot: { unmount: () => void } | null = null;

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
  });

  it("publishes the active editor when it registers after the active Block is known", () => {
    const harness = createHarness();
    mountedRoot = harness;
    const editor = createEditorHandle();

    act(() => {
      harness.getSnapshot().setActiveBlockId("block-1");
    });

    expect(harness.getSnapshot().activeBlockId).toBe("block-1");
    expect(harness.getSnapshot().activeEditor).toBeUndefined();

    act(() => {
      harness.getSnapshot().registerEditor("block-1", editor);
    });

    expect(harness.getSnapshot().activeEditor).toBe(editor);
  });

  it("clears stale active editor handles when the active editor unregisters", () => {
    const harness = createHarness();
    mountedRoot = harness;
    const editor = createEditorHandle();

    act(() => {
      harness.getSnapshot().registerEditor("block-1", editor);
      harness.getSnapshot().setActiveBlockId("block-1");
    });

    expect(harness.getSnapshot().activeEditor).toBe(editor);

    act(() => {
      harness.getSnapshot().registerEditor("block-1", null);
    });

    expect(harness.getSnapshot().activeBlockId).toBe("block-1");
    expect(harness.getSnapshot().activeEditor).toBeUndefined();
  });

  it("switches the active editor when the active Block changes", () => {
    const harness = createHarness();
    mountedRoot = harness;
    const firstEditor = createEditorHandle();
    const secondEditor = createEditorHandle();

    act(() => {
      harness.getSnapshot().registerEditor("block-1", firstEditor);
      harness.getSnapshot().registerEditor("block-2", secondEditor);
      harness.getSnapshot().setActiveBlockId("block-1");
    });

    expect(harness.getSnapshot().activeEditor).toBe(firstEditor);

    act(() => {
      harness.getSnapshot().setActiveBlockId("block-2");
    });

    expect(harness.getSnapshot().activeEditor).toBe(secondEditor);
  });
});
