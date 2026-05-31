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
        config: { shortcuts: { editor: { "editor.bold": "Control+Shift+B" } } },
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
    expect(editorRef.current?.getToolbarState().inlineFormats.bold).toBe(true);
  });

  it("blocks browser format shortcuts that are not configured by Fluxnotes", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor(
      {
        config: { shortcuts: { editor: { "editor.bold": null } } },
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

    expect(editorRef.current?.getToolbarState().inlineFormats.bold).toBe(false);
  });

  it("runs toolbar block commands through the public handle", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor({ initialMarkdown: "Title" }, editorRef);
    await findBlockEditor(container);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "heading2", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().blockFormat).toBe("heading2");
    await expect(editorRef.current?.flush()).resolves.toContain("## Title");
  });

  it("toggles toolbar text block commands back to paragraph", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor({ initialMarkdown: "Title" }, editorRef);
    await findBlockEditor(container);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "heading2", type: "set-block" });
      editorRef.current?.runToolbarCommand({ format: "heading2", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().blockFormat).toBe("paragraph");
    await expect(editorRef.current?.flush()).resolves.toContain("Title");
  });

  it("toggles toolbar code block commands back to paragraph", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor({ initialMarkdown: "const value = 1;" }, editorRef);
    await findBlockEditor(container);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "codeBlock", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().blockFormat).toBe("codeBlock");

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "codeBlock", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().blockFormat).toBe("paragraph");
    await expect(editorRef.current?.flush()).resolves.toContain("const value = 1;");
  });

  it("toggles toolbar blockquote commands back to paragraph", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor({ initialMarkdown: "Quote" }, editorRef);
    await findBlockEditor(container);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "blockquote", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().activeBlocks.blockquote).toBe(true);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "blockquote", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().activeBlocks.blockquote).toBe(false);
    await expect(editorRef.current?.flush()).resolves.toContain("Quote");
  });

  it("runs toolbar list commands through the public handle", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor({ initialMarkdown: "Task" }, editorRef);
    await findBlockEditor(container);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "taskList", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().activeBlocks.taskList).toBe(true);
    await expect(editorRef.current?.flush()).resolves.toContain("* [ ] Task");

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "orderedList", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().activeBlocks.orderedList).toBe(true);
    expect(editorRef.current?.getToolbarState().activeBlocks.taskList).toBe(false);
    await expect(editorRef.current?.flush()).resolves.toContain("1. Task");
  });

  it("toggles toolbar list commands back to paragraph", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor({ initialMarkdown: "Task" }, editorRef);
    await findBlockEditor(container);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "taskList", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().activeBlocks.taskList).toBe(true);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "taskList", type: "set-block" });
    });

    expect(editorRef.current?.getToolbarState().activeBlocks.taskList).toBe(false);
    await expect(editorRef.current?.flush()).resolves.toContain("Task");
  });

  it("toggles configured Block Editor block shortcuts back to paragraph", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor(
      {
        config: { shortcuts: { editor: { "editor.heading2": "Control+Shift+2" } } },
        initialMarkdown: "Title",
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    editor.focus();

    for (const key of ["2", "2"]) {
      const configuredEvent = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        key,
        shiftKey: true,
      });

      await act(async () => {
        editor.dispatchEvent(configuredEvent);
      });

      expect(configuredEvent.defaultPrevented).toBe(true);
    }

    expect(editorRef.current?.getToolbarState().blockFormat).toBe("paragraph");
    await expect(editorRef.current?.flush()).resolves.toContain("Title");
  });

  it("applies configured Block Editor task list shortcuts", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor(
      {
        config: { shortcuts: { editor: { "editor.taskList": "Control+Shift+9" } } },
        initialMarkdown: "Task",
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    editor.focus();
    const configuredEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "9",
      shiftKey: true,
    });

    await act(async () => {
      editor.dispatchEvent(configuredEvent);
    });

    expect(configuredEvent.defaultPrevented).toBe(true);
    expect(editorRef.current?.getToolbarState().activeBlocks.taskList).toBe(true);
    await expect(editorRef.current?.flush()).resolves.toContain("* [ ] Task");
  });

  it("disables Block Editor task list shortcuts when cleared", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor(
      {
        config: { shortcuts: { editor: { "editor.taskList": null } } },
        initialMarkdown: "Task",
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    editor.focus();
    const taskListEvent = new KeyboardEvent("keydown", {
      altKey: true,
      bubbles: true,
      cancelable: true,
      key: "9",
      metaKey: true,
    });

    await act(async () => {
      editor.dispatchEvent(taskListEvent);
    });

    expect(editorRef.current?.getToolbarState().activeBlocks.taskList).toBe(false);
    await expect(editorRef.current?.flush()).resolves.toContain("Task");
  });

  it("runs toolbar inline commands through the public handle", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderBlockEditor({ initialMarkdown: "Plain" }, editorRef);
    const editor = await findBlockEditor(container);
    editor.focus();

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "inlineCode", type: "toggle-inline" });
    });

    expect(editorRef.current?.getToolbarState().inlineFormats.inlineCode).toBe(true);
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
        html: expect.stringContaining("file:///tmp/photo.png"),
        imageFileUrl: "file:///tmp/photo.png",
        text: expect.stringContaining("file:///tmp/photo.png"),
      }),
    );
  });

  it("stores pasted data image URLs as block assets", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const runtime = createBlockEditorRuntime();
    const dataUrl = "data:image/png;base64,AQID";
    runtime.assets.create = vi.fn(async () => ({
      assets: [{ altText: "photo.png", assetUrl: "assets://block/photo.png" }],
    }));

    const { container } = renderBlockEditor(
      {
        initialMarkdown: "",
        runtime,
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        getData: (type: string) => {
          if (type === "text/html") return `<p>Before</p><img alt="Alt" src="${dataUrl}">`;
          if (type === "text/plain") return "";
          return "";
        },
        items: [],
      },
    });

    await act(async () => {
      editor.dispatchEvent(pasteEvent);
    });

    await waitFor(() => {
      expect(runtime.assets.create).toHaveBeenCalledWith({
        assets: [{ dataBase64: "AQID", mimeType: "image/png" }],
      });
    });
    await waitFor(async () => {
      const markdown = await editorRef.current?.flush();
      expect(markdown).toContain("assets://block/photo.png");
      expect(markdown).not.toContain("data:image");
    });
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
