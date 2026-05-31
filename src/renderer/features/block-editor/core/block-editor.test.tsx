// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createBlockEditorRuntime,
  createBlockEditorElement,
  findBlockEditor,
  renderBlockEditor,
  setMockResolvedTheme,
} from "../test/block-editor-test-utils";
import type { BlockEditorHandle } from "./types";

describe("BlockEditor", () => {
  it("exposes a labeled editing surface for a Block", async () => {
    const { container } = renderBlockEditor({ initialMarkdown: "Hello" });

    expect(await findBlockEditor(container)).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeVisible();
  });

  it("flushes the latest Markdown through the public handle", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor({ initialMarkdown: "**Hello**" }, editorRef);
    await findBlockEditor(container);

    await expect(editorRef.current?.flush()).resolves.toContain("Hello");
  });

  it("applies configured Block Editor text format shortcuts", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor(
      {
        config: { shortcuts: { editor: { "editor.formatBold": "Control+Shift+B" } } },
        initialMarkdown: "",
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    editor.focus();
    const configuredEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "b",
      shiftKey: true,
    });

    await act(async () => {
      editor.dispatchEvent(configuredEvent);
    });

    expect(configuredEvent.defaultPrevented).toBe(true);
    expect(editorRef.current?.getToolbarState().textFormats.bold).toBe(true);
  });

  it("blocks browser format shortcuts that are not configured by Fluxnotes", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor(
      {
        config: { shortcuts: { editor: { "editor.formatBold": null } } },
        initialMarkdown: "Plain text",
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    editor.focus();
    const boldEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "b",
    });

    await act(async () => {
      editor.dispatchEvent(boldEvent);
    });

    expect(editorRef.current?.getToolbarState().textFormats.bold).toBe(false);
  });

  it("copies Markdown content through the runtime clipboard", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const runtime = createBlockEditorRuntime();
    runtime.assets.resolve = vi.fn(async () => ({
      assets: [{ assetUrl: "assets://block/photo.png", fileUrl: "file:///tmp/photo.png" }],
    }));

    const { container } = renderBlockEditor(
      {
        initialMarkdown: "![Alt](assets://block/photo.png)",
        runtime,
      },
      editorRef,
    );
    await findBlockEditor(container);

    await editorRef.current?.copy();

    expect(runtime.clipboard.write).toHaveBeenCalledWith(
      expect.objectContaining({
        imageFileUrl: "file:///tmp/photo.png",
        text: expect.stringContaining("assets://block/photo.png"),
      }),
    );
  });

  it("recreates the editor on theme changes while preserving code block behavior", async () => {
    const runtime = createBlockEditorRuntime();
    const initialMarkdown = ["```ts", "const answer = 42;", "```"].join("\n");
    const { container, rerender } = renderBlockEditor({
      initialMarkdown,
      runtime,
    });
    const initialEditor = await findBlockEditor(container);

    setMockResolvedTheme("dark");
    rerender(
      createBlockEditorElement({
        initialMarkdown,
        runtime,
        onMarkdownChange: () => undefined,
      }),
    );

    await waitFor(() => {
      expect(container.querySelector(".block-editor__content")).not.toBe(initialEditor);
    });
    await userEvent.click(await screen.findByRole("button", { name: "Copy code" }));

    expect(runtime.clipboard.writeText).toHaveBeenCalledWith("const answer = 42;");
  });

  it("notifies Markdown changes from user editing", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();

    const { container } = renderBlockEditor({ initialMarkdown: "", onMarkdownChange });
    const editor = await findBlockEditor(container);

    await user.click(editor);
    await user.keyboard("Hello");

    await waitFor(() => {
      expect(onMarkdownChange).toHaveBeenCalledWith(expect.stringContaining("Hello"));
    });
  });

  it("keeps the active editor mounted when the initial Markdown prop changes", async () => {
    const onMarkdownChange = vi.fn();
    const runtime = createBlockEditorRuntime();
    const editorRef = createRef<BlockEditorHandle>();
    const { container, rerender } = renderBlockEditor(
      {
        initialMarkdown: "Local content",
        onMarkdownChange,
        runtime,
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);

    editor.focus();

    rerender(
      createBlockEditorElement(
        {
          initialMarkdown: "Persisted content",
          runtime,
          onMarkdownChange,
        },
        editorRef,
      ),
    );

    expect(document.activeElement).toBe(editor);
    expect(screen.getByText("Local content")).toBeVisible();
    expect(screen.queryByText("Persisted content")).not.toBeInTheDocument();
  });
});
