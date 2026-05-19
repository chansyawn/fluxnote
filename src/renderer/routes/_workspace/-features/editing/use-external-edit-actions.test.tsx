// @vitest-environment jsdom

import { queryClient } from "@renderer/app/query";
import type { Block, ListBlocksResult } from "@renderer/clients";
import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { PersistedBlockEditorHandle } from "./persisted-block-editor";

const clientMocks = vi.hoisted(() => ({
  cancelExternalEdit: vi.fn(),
  submitExternalEdit: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  cancelExternalEdit: clientMocks.cancelExternalEdit,
  submitExternalEdit: clientMocks.submitExternalEdit,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: clientMocks.toastError,
  },
}));

import { useExternalEditActions } from "./use-external-edit-actions";

interface ExternalEditActionsSnapshot {
  handleCancelExternalEdit: ReturnType<typeof useExternalEditActions>["handleCancelExternalEdit"];
  handleSubmitExternalEdit: ReturnType<typeof useExternalEditActions>["handleSubmitExternalEdit"];
  pendingExternalEditIds: ReturnType<typeof useExternalEditActions>["pendingExternalEditIds"];
}

interface ExternalEditActionsHarnessProps {
  getEditor: (blockId: string) => PersistedBlockEditorHandle | undefined;
  navigateToBlock?: (blockId: string) => Promise<void>;
  onSnapshot: (snapshot: ExternalEditActionsSnapshot) => void;
}

function ExternalEditActionsHarness({
  getEditor,
  navigateToBlock,
  onSnapshot,
}: ExternalEditActionsHarnessProps) {
  const actions = useExternalEditActions({ getEditor, navigateToBlock });

  useLayoutEffect(() => {
    onSnapshot(actions);
  });

  return null;
}

function createBlock(id: string, content: string): Block {
  return {
    archivedAt: null,
    content,
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    isKept: false,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    willArchive: false,
  };
}

function createHarness(options: {
  getEditor: ExternalEditActionsHarnessProps["getEditor"];
  navigateToBlock?: ExternalEditActionsHarnessProps["navigateToBlock"];
}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let snapshot: ExternalEditActionsSnapshot | null = null;

  act(() => {
    root.render(
      <ExternalEditActionsHarness
        getEditor={options.getEditor}
        navigateToBlock={options.navigateToBlock}
        onSnapshot={(nextSnapshot) => {
          snapshot = nextSnapshot;
        }}
      />,
    );
  });

  return {
    getSnapshot(): ExternalEditActionsSnapshot {
      if (!snapshot) {
        throw new Error("External edit actions snapshot is unavailable.");
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

describe("useExternalEditActions", () => {
  let mountedRoot: { unmount: () => void } | null = null;

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    queryClient.clear();
    clientMocks.cancelExternalEdit.mockReset();
    clientMocks.submitExternalEdit.mockReset();
    clientMocks.toastError.mockReset();
  });

  it("normalizes live editor content before external edit submission", async () => {
    clientMocks.submitExternalEdit.mockResolvedValue(createBlock("block-1", ""));
    const editor: PersistedBlockEditorHandle = {
      copy: vi.fn(async () => undefined),
      flush: vi.fn(async () => String.raw`a\_b \$5 \$x\$`),
      focus: vi.fn(),
    };
    const navigateToBlock = vi.fn(async () => undefined);
    const harness = createHarness({
      getEditor: vi.fn(() => editor),
      navigateToBlock,
    });
    mountedRoot = harness;

    await act(async () => {
      await harness.getSnapshot().handleSubmitExternalEdit("block-1", "edit-1");
    });

    expect(clientMocks.submitExternalEdit).toHaveBeenCalledWith({
      content: String.raw`a_b $5 \$x\$`,
      editId: "edit-1",
    });
    expect(navigateToBlock).toHaveBeenCalledWith("block-1");
  });

  it("normalizes cached block content before external edit submission", async () => {
    clientMocks.submitExternalEdit.mockResolvedValue(createBlock("block-1", ""));
    const cachedBlocks: ListBlocksResult = {
      blocks: [createBlock("block-1", String.raw`a\_b \$5`)],
      limit: 50,
      offset: 0,
      totalCount: 1,
    };
    queryClient.setQueryData(["blocks", "active"], cachedBlocks);
    const harness = createHarness({
      getEditor: vi.fn(() => undefined),
    });
    mountedRoot = harness;

    await act(async () => {
      await harness.getSnapshot().handleSubmitExternalEdit("block-1", "edit-1");
    });

    expect(clientMocks.submitExternalEdit).toHaveBeenCalledWith({
      content: "a_b $5",
      editId: "edit-1",
    });
  });

  it("does not submit external edit when block content is unavailable", async () => {
    const harness = createHarness({
      getEditor: vi.fn(() => undefined),
    });
    mountedRoot = harness;

    await act(async () => {
      await harness.getSnapshot().handleSubmitExternalEdit("missing-block", "edit-1");
    });

    expect(clientMocks.submitExternalEdit).not.toHaveBeenCalled();
    expect(clientMocks.toastError).toHaveBeenCalledWith(
      "Cannot submit: block content unavailable.",
    );
  });
});
