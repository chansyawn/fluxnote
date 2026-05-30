// @vitest-environment jsdom

import type { Block } from "@renderer/clients";
import { renderWithProviders } from "@renderer/test/render";
import { useEffect } from "react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  updateBlockContent: vi.fn(),
}));

vi.mock("@renderer/clients", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@renderer/clients")>();
  return {
    ...actual,
    updateBlockContent: clientMocks.updateBlockContent,
  };
});

import { useBlockEditorPersistence } from "./block-editor-persistence";

type BlockPersistence = ReturnType<typeof useBlockEditorPersistence>;

function createBlock(id: string, content: string): Block {
  return {
    archivedAt: null,
    content,
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    isKept: false,
    isPendingAutoArchive: false,
    isPinned: false,
    orderIndex: 0,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function renderPersistenceProbe(block: Block) {
  let persistence: BlockPersistence | undefined;

  function Probe() {
    const snapshot = useBlockEditorPersistence(block);
    useEffect(() => {
      persistence = snapshot;
    }, [snapshot]);
    return null;
  }

  renderWithProviders(<Probe />);

  if (!persistence) {
    throw new Error("Block persistence probe did not render.");
  }

  return persistence;
}

describe("useBlockEditorPersistence", () => {
  afterEach(() => {
    vi.useRealTimers();
    clientMocks.updateBlockContent.mockReset();
  });

  it("debounces typing into a single content save", async () => {
    vi.useFakeTimers();
    clientMocks.updateBlockContent.mockImplementation(async ({ blockId, content }) =>
      createBlock(blockId, content),
    );
    const persistence = renderPersistenceProbe(createBlock("block-1", ""));

    act(() => {
      persistence.saveMarkdown("H");
      persistence.saveMarkdown("He");
      persistence.saveMarkdown("Hel");
    });

    expect(clientMocks.updateBlockContent).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(499);
      await Promise.resolve();
    });

    expect(clientMocks.updateBlockContent).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(clientMocks.updateBlockContent).toHaveBeenCalledOnce();
    expect(clientMocks.updateBlockContent).toHaveBeenCalledWith({
      blockId: "block-1",
      content: "Hel",
    });
  });

  it("flushes pending content without waiting for the debounce timer", async () => {
    vi.useFakeTimers();
    clientMocks.updateBlockContent.mockImplementation(async ({ blockId, content }) =>
      createBlock(blockId, content),
    );
    const persistence = renderPersistenceProbe(createBlock("block-1", ""));

    act(() => {
      persistence.saveMarkdown("draft");
    });

    await act(async () => {
      await persistence.flushSave();
    });

    expect(clientMocks.updateBlockContent).toHaveBeenCalledOnce();
    expect(clientMocks.updateBlockContent).toHaveBeenCalledWith({
      blockId: "block-1",
      content: "draft",
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(clientMocks.updateBlockContent).toHaveBeenCalledOnce();
  });

  it("saves the latest content after an earlier in-flight save resolves", async () => {
    vi.useFakeTimers();
    const firstSave = createDeferred<Block>();
    clientMocks.updateBlockContent
      .mockReturnValueOnce(firstSave.promise)
      .mockImplementation(async ({ blockId, content }) => createBlock(blockId, content));
    const persistence = renderPersistenceProbe(createBlock("block-1", ""));

    act(() => {
      persistence.saveMarkdown("draft");
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(clientMocks.updateBlockContent).toHaveBeenCalledOnce();

    act(() => {
      persistence.saveMarkdown("");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    await act(async () => {
      firstSave.resolve(createBlock("block-1", "draft"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(clientMocks.updateBlockContent).toHaveBeenCalledTimes(2);
    expect(clientMocks.updateBlockContent).toHaveBeenLastCalledWith({
      blockId: "block-1",
      content: "",
    });
  });
});
