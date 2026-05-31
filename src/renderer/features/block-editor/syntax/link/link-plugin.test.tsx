// @vitest-environment jsdom

import type { BlockEditorHandle } from "@renderer/features/block-editor/core/types";
import {
  createBlockEditorRuntime,
  findBlockEditor,
  renderBlockEditor,
} from "@renderer/features/block-editor/test/block-editor-test-utils";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

async function findLink(container: HTMLElement, label: string): Promise<HTMLAnchorElement> {
  await waitFor(() => {
    expect(container.querySelector("a")).toBeInTheDocument();
  });

  const link = screen.getByRole("link", { name: label });
  return link as HTMLAnchorElement;
}

async function showLinkPopover(container: HTMLElement, label: string): Promise<HTMLAnchorElement> {
  const link = await findLink(container, label);
  vi.spyOn(link, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 20, 80, 20));

  await act(async () => {
    link.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 24,
      }),
    );
  });

  await screen.findByRole("textbox", { name: "Link URL" });
  return link;
}

describe("link plugin", () => {
  it("renders Markdown links with the link popover", async () => {
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
    });
    await findBlockEditor(container);

    await showLinkPopover(container, "Fluxnotes");

    expect(screen.getByRole("textbox", { name: "Link URL" })).toHaveValue("https://example.com");
    expect(screen.getByRole("button", { name: "Open" })).toBeVisible();
  });

  it("opens a hovered link through the runtime", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
      runtime,
    });
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(runtime.links.openExternal).toHaveBeenCalledWith("https://example.com");
  });

  it("copies a hovered link through the runtime", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
      runtime,
    });
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(runtime.clipboard.writeText).toHaveBeenCalledWith("https://example.com");
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
  });

  it("keeps the link popover open when the pointer returns before hover close", async () => {
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
    });
    const editor = await findBlockEditor(container);
    const link = await showLinkPopover(container, "Fluxnotes");

    vi.useFakeTimers();

    await act(async () => {
      editor.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 4,
          clientY: 4,
        }),
      );
    });

    await act(async () => {
      link.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 24,
          clientY: 24,
        }),
      );
    });

    act(() => {
      vi.advanceTimersByTime(121);
    });

    expect(screen.getByRole("button", { name: "Open" })).toBeVisible();
  });

  it("edits a hovered link url", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: "[Fluxnotes](https://example.com)",
      },
      editorRef,
    );
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    const input = screen.getByRole("textbox", { name: "Link URL" });
    await userEvent.clear(input);
    await userEvent.type(input, "https://fluxnotes.local");

    await expect(editorRef.current?.flush()).resolves.toContain(
      "[Fluxnotes](https://fluxnotes.local)",
    );
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
  });

  it("keeps the link input open when the pointer moves back to the anchor", async () => {
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
    });
    const editor = await findBlockEditor(container);
    const link = await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("textbox", { name: "Link URL" }));
    expect(screen.getByRole("textbox", { name: "Link URL" })).toBeVisible();

    vi.useFakeTimers();

    await act(async () => {
      editor.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 4,
          clientY: 4,
        }),
      );
    });

    act(() => {
      vi.advanceTimersByTime(121);
    });

    expect(screen.getByRole("textbox", { name: "Link URL" })).toBeVisible();

    await act(async () => {
      link.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 24,
          clientY: 24,
        }),
      );
    });

    expect(screen.getByRole("textbox", { name: "Link URL" })).toBeVisible();
  });

  it("allows a hovered link url to be empty", async () => {
    const runtime = createBlockEditorRuntime();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: "[Fluxnotes](https://example.com)",
        runtime,
      },
      editorRef,
    );
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    const input = screen.getByRole("textbox", { name: "Link URL" });
    await userEvent.clear(input);

    await expect(editorRef.current?.flush()).resolves.toContain("[Fluxnotes]()");
    expect(screen.getByRole("button", { name: "Open" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(runtime.links.openExternal).not.toHaveBeenCalled();
    expect(runtime.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("removes a hovered link while keeping its text", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: "[Fluxnotes](https://example.com)",
      },
      editorRef,
    );
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await expect(editorRef.current?.flush()).resolves.toContain("Fluxnotes");
    await expect(editorRef.current?.flush()).resolves.not.toContain("https://example.com");
  });
});
