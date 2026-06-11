// @vitest-environment jsdom

import { DEFAULT_BLOCK_EDITOR_ACTION_STATE } from "@fluxnotes/editor";
import { queryClient } from "@renderer/app/query";
import type { Block, ListBlocksResult } from "@renderer/clients";
import { createCopyOnlyExternalEditSession } from "@renderer/test/fixtures";
import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";

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

vi.mock("@fluxnotes/ui/components/sonner", () => ({
  toast: {
    error: clientMocks.toastError,
  },
}));

import { useExternalEditSubmission } from "./external-edit-submission";

interface ExternalEditSubmissionSnapshot {
  handleCancelExternalEdit: ReturnType<
    typeof useExternalEditSubmission
  >["handleCancelExternalEdit"];
  handleSubmitExternalEdit: ReturnType<
    typeof useExternalEditSubmission
  >["handleSubmitExternalEdit"];
  pendingExternalEditIds: ReturnType<typeof useExternalEditSubmission>["pendingExternalEditIds"];
}

interface ExternalEditSubmissionHarnessProps {
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
  navigateToBlock?: (blockId: string) => Promise<void>;
  onSnapshot: (snapshot: ExternalEditSubmissionSnapshot) => void;
}

function ExternalEditSubmissionHarness({
  getEditor,
  navigateToBlock,
  onSnapshot,
}: ExternalEditSubmissionHarnessProps) {
  const actions = useExternalEditSubmission({ getEditor, navigateToBlock });

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
    isPinned: false,
    orderIndex: 0,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    isPendingAutoArchive: false,
  };
}

function createHarness(options: {
  getEditor: ExternalEditSubmissionHarnessProps["getEditor"];
  navigateToBlock?: ExternalEditSubmissionHarnessProps["navigateToBlock"];
}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let snapshot: ExternalEditSubmissionSnapshot | null = null;

  act(() => {
    root.render(
      <ExternalEditSubmissionHarness
        getEditor={options.getEditor}
        navigateToBlock={options.navigateToBlock}
        onSnapshot={(nextSnapshot) => {
          snapshot = nextSnapshot;
        }}
      />,
    );
  });

  return {
    getSnapshot(): ExternalEditSubmissionSnapshot {
      if (!snapshot) {
        throw new Error("External edit submission snapshot is unavailable.");
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

describe("useExternalEditSubmission", () => {
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
    const editor: WorkspaceBlockEditorHandle = {
      copy: vi.fn(async () => undefined),
      executeAction: vi.fn((action) => ({
        action,
        focus: "editor" as const,
        status: "executed" as const,
      })),
      flush: vi.fn(async () => String.raw`a\_b \$5 \$x\$`),
      focus: vi.fn(),
      getActionState: () => DEFAULT_BLOCK_EDITOR_ACTION_STATE,
      getPreviewData: vi.fn(async () => ""),
      subscribeActionState: () => () => undefined,
      subscribePreviewChange: () => () => undefined,
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
      id: "edit-1",
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
      id: "edit-1",
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

  it("copies the current block before ending copy-only external edit sessions", async () => {
    clientMocks.submitExternalEdit.mockResolvedValue(createBlock("block-1", ""));
    const copy = vi.fn(async () => undefined);
    const editor: WorkspaceBlockEditorHandle = {
      copy,
      executeAction: vi.fn((action) => ({
        action,
        focus: "editor" as const,
        status: "executed" as const,
      })),
      flush: vi.fn(async () => "copied content"),
      focus: vi.fn(),
      getActionState: () => DEFAULT_BLOCK_EDITOR_ACTION_STATE,
      getPreviewData: vi.fn(async () => ""),
      subscribeActionState: () => () => undefined,
      subscribePreviewChange: () => () => undefined,
    };
    const harness = createHarness({
      getEditor: vi.fn(() => editor),
    });
    mountedRoot = harness;

    await act(async () => {
      await harness
        .getSnapshot()
        .handleSubmitExternalEdit("block-1", "edit-1", createCopyOnlyExternalEditSession());
    });

    expect(copy).toHaveBeenCalledOnce();
    expect(clientMocks.submitExternalEdit).toHaveBeenCalledWith({
      content: "copied content",
      id: "edit-1",
    });
  });

  it("still ends copy-only external edit sessions when block copy fails", async () => {
    clientMocks.submitExternalEdit.mockResolvedValue(createBlock("block-1", ""));
    const editor: WorkspaceBlockEditorHandle = {
      copy: vi.fn(async () => {
        throw new Error("Clipboard unavailable");
      }),
      executeAction: vi.fn((action) => ({
        action,
        focus: "editor" as const,
        status: "executed" as const,
      })),
      flush: vi.fn(async () => "fallback content"),
      focus: vi.fn(),
      getActionState: () => DEFAULT_BLOCK_EDITOR_ACTION_STATE,
      getPreviewData: vi.fn(async () => ""),
      subscribeActionState: () => () => undefined,
      subscribePreviewChange: () => () => undefined,
    };
    const harness = createHarness({
      getEditor: vi.fn(() => editor),
    });
    mountedRoot = harness;

    await act(async () => {
      await harness
        .getSnapshot()
        .handleSubmitExternalEdit("block-1", "edit-1", createCopyOnlyExternalEditSession());
    });

    expect(clientMocks.toastError).toHaveBeenCalledWith("Clipboard unavailable");
    expect(clientMocks.submitExternalEdit).toHaveBeenCalledWith({
      content: "fallback content",
      id: "edit-1",
    });
  });
});
