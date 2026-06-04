// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  DEFAULT_BLOCK_EDITOR_ACTION_STATE,
  type BlockEditorHandle,
  type BlockEditorPreviewDataRequest,
} from "../index";
import { PlaygroundPreview } from "./playground-preview";

function createEditorHandle(overrides: Partial<BlockEditorHandle> = {}): BlockEditorHandle {
  return {
    copy: vi.fn(async () => undefined),
    executeAction: vi.fn((action) => ({
      action,
      focus: "editor" as const,
      status: "unknown" as const,
    })),
    flush: vi.fn(async () => "Markdown source"),
    focus: vi.fn(),
    getActionState: vi.fn(() => DEFAULT_BLOCK_EDITOR_ACTION_STATE),
    getPreviewData: vi.fn(async ({ kind }: BlockEditorPreviewDataRequest) => `${kind} content`),
    subscribeActionState: vi.fn(() => () => undefined),
    subscribePreviewChange: vi.fn(() => () => undefined),
    ...overrides,
  };
}

async function flushPreviewDebounce(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(250);
    await Promise.resolve();
  });
}

describe("PlaygroundPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders source tabs and defaults to markdown", async () => {
    const editor = createEditorHandle();

    render(<PlaygroundPreview editor={editor} />);
    await flushPreviewDebounce();

    expect(screen.getByRole("tab", { name: "Markdown SRC" })).toHaveAttribute("data-active", "");
    expect(screen.getByRole("tab", { name: "Markdown SEL" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Markdown ALL" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "HTML SEL" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "HTML ALL" })).toBeInTheDocument();
    expect(editor.getPreviewData).toHaveBeenCalledWith({ kind: "markdown-source" });
  });

  it("requests the preview data kind for each export tab", async () => {
    const editor = createEditorHandle();

    render(<PlaygroundPreview editor={editor} />);
    await flushPreviewDebounce();

    fireEvent.click(screen.getByRole("tab", { name: "Markdown SEL" }));
    await flushPreviewDebounce();
    expect(editor.getPreviewData).toHaveBeenLastCalledWith({ kind: "markdown-selected-export" });

    fireEvent.click(screen.getByRole("tab", { name: "Markdown ALL" }));
    await flushPreviewDebounce();
    expect(editor.getPreviewData).toHaveBeenLastCalledWith({ kind: "markdown-document-export" });

    fireEvent.click(screen.getByRole("tab", { name: "HTML SEL" }));
    await flushPreviewDebounce();
    expect(editor.getPreviewData).toHaveBeenLastCalledWith({ kind: "html-selected-export" });

    fireEvent.click(screen.getByRole("tab", { name: "HTML ALL" }));
    await flushPreviewDebounce();
    expect(editor.getPreviewData).toHaveBeenLastCalledWith({ kind: "html-document-export" });
  });

  it("does not render legacy preview controls", () => {
    render(<PlaygroundPreview editor={createEditorHandle()} />);

    expect(screen.queryByRole("button", { name: "Flush" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
