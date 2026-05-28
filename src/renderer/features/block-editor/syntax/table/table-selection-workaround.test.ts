import type { LexicalEditor } from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import { refreshTableSelectionObserverRegistration } from "./table-selection-workaround";

function createRootListenerEditor(): {
  editor: Pick<LexicalEditor, "registerRootListener">;
  notifyRootAttached: () => void;
  unregisterRootListener: ReturnType<typeof vi.fn>;
} {
  let rootListener: Parameters<LexicalEditor["registerRootListener"]>[0] | null = null;
  const unregisterRootListener = vi.fn();

  return {
    editor: {
      registerRootListener(listener) {
        rootListener = listener;
        return unregisterRootListener;
      },
    },
    notifyRootAttached() {
      rootListener?.({} as HTMLElement, null);
    },
    unregisterRootListener,
  };
}

describe("refreshTableSelectionObserverRegistration", () => {
  it("toggles the table tab handler signal after the root element attaches", async () => {
    const { editor, notifyRootAttached } = createRootListenerEditor();
    const writes: boolean[] = [];
    let value = true;
    const hasTabHandler = {
      get value() {
        return value;
      },
      set value(nextValue: boolean) {
        writes.push(nextValue);
        value = nextValue;
      },
    };

    refreshTableSelectionObserverRegistration(editor, hasTabHandler);
    notifyRootAttached();

    expect(writes).toEqual([]);

    await Promise.resolve();

    expect(writes).toEqual([false, true]);
    expect(hasTabHandler.value).toBe(true);
  });

  it("does not toggle the signal after cleanup", async () => {
    const { editor, notifyRootAttached, unregisterRootListener } = createRootListenerEditor();
    const hasTabHandler = { value: true };

    const cleanup = refreshTableSelectionObserverRegistration(editor, hasTabHandler);
    notifyRootAttached();
    cleanup();

    await Promise.resolve();

    expect(hasTabHandler.value).toBe(true);
    expect(unregisterRootListener).toHaveBeenCalledTimes(1);
  });
});
