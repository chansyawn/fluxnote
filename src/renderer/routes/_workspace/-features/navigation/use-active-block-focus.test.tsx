// @vitest-environment jsdom

import { act, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { ActiveBlockFocus } from "./use-active-block-focus";
import { useActiveBlockFocus } from "./use-active-block-focus";

function ActiveBlockFocusHarness({
  onSnapshot,
}: {
  onSnapshot: (snapshot: ActiveBlockFocus) => void;
}) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>("block-1");
  const focus = useActiveBlockFocus({ activeBlockId, setActiveBlockId });

  useLayoutEffect(() => {
    onSnapshot(focus);
  });

  return null;
}

function createHarness() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let snapshot: ActiveBlockFocus | null = null;

  act(() => {
    root.render(
      <ActiveBlockFocusHarness
        onSnapshot={(nextSnapshot) => {
          snapshot = nextSnapshot;
        }}
      />,
    );
  });

  return {
    getSnapshot(): ActiveBlockFocus {
      if (!snapshot) {
        throw new Error("Active block focus snapshot is unavailable.");
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

describe("useActiveBlockFocus", () => {
  let mountedRoot: { unmount: () => void } | null = null;

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.replaceChildren();
  });

  it("reports whether the active block editor owns DOM focus", () => {
    const harness = createHarness();
    mountedRoot = harness;
    const editor = document.createElement("div");
    editor.tabIndex = -1;
    editor.dataset.blockId = "block-1";
    document.body.append(editor);

    editor.focus();

    expect(harness.getSnapshot().isActiveBlockEditorFocused()).toBe(true);
  });

  it("updates active block focus through the module interface", () => {
    const harness = createHarness();
    mountedRoot = harness;

    act(() => {
      harness.getSnapshot().focusBlock("block-2");
    });

    expect(harness.getSnapshot().activeBlockId).toBe("block-2");
  });
});
