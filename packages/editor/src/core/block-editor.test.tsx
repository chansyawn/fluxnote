// @vitest-environment jsdom

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { createBlockEditorRuntime } from "../test-helper/editor-driver";
import { BlockEditor } from "./block-editor";
import type { BlockEditorHandle } from "./types";

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

i18n.load("en", {});
i18n.activate("en");

async function flushAnimationFrames(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }
}

function selectEditorText(textbox: HTMLElement, text: string): void {
  const walker = document.createTreeWalker(textbox, NodeFilter.SHOW_TEXT);
  let textNode: Node | null = null;

  while (!textNode) {
    const node = walker.nextNode();
    if (!node) break;
    if (node.textContent === text) textNode = node;
  }

  if (!textNode) throw new Error(`Unable to find text node "${text}".`);

  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, text.length);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe("BlockEditor", () => {
  it("exposes a labeled editing surface for a Block", () => {
    render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          initialMarkdown="Hello"
          runtime={createBlockEditorRuntime()}
          onMarkdownChange={() => undefined}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("textbox", { name: /markdown block editor/i })).toBeInTheDocument();
  });

  it("applies configured Block Editor text format shortcuts", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          ref={editorRef}
          config={{ shortcuts: { actions: { "editor.bold": "Control+Shift+B" } } }}
          initialMarkdown=""
          runtime={createBlockEditorRuntime()}
          onMarkdownChange={() => undefined}
        />
      </I18nProvider>,
    );

    const editor = screen.getByRole("textbox", { name: /markdown block editor/i });
    editor.focus();

    const oldDefaultEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "b",
    });
    const configuredEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "b",
      shiftKey: true,
    });

    await act(async () => {
      editor.dispatchEvent(oldDefaultEvent);
    });

    expect(oldDefaultEvent.defaultPrevented).toBe(true);
    expect(editorRef.current?.getActionState().activeActions["editor.bold"]).toBe(false);

    await act(async () => {
      editor.dispatchEvent(configuredEvent);
    });

    expect(configuredEvent.defaultPrevented).toBe(true);
    expect(editorRef.current?.getActionState().activeActions["editor.bold"]).toBe(true);
  });

  it("blocks Lexical format shortcuts that are not configured by Fluxnotes", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          ref={editorRef}
          config={{ shortcuts: { actions: { "editor.bold": null } } }}
          initialMarkdown="Plain text"
          runtime={createBlockEditorRuntime()}
          onMarkdownChange={() => undefined}
        />
      </I18nProvider>,
    );

    const editor = screen.getByRole("textbox", { name: /markdown block editor/i });
    editor.focus();
    const boldEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "b",
    });
    const underlineEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "u",
    });

    await act(async () => {
      editor.dispatchEvent(boldEvent);
      editor.dispatchEvent(underlineEvent);
    });

    expect(boldEvent.defaultPrevented).toBe(true);
    expect(underlineEvent.defaultPrevented).toBe(true);
    expect(editor.textContent).toBe("Plain text");
    expect(editorRef.current?.getActionState().activeActions["editor.bold"]).toBe(false);
  });

  it("consumes repeated Lexical default format shortcuts without applying them", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          ref={editorRef}
          config={{ shortcuts: { actions: { "editor.bold": "Control+Shift+B" } } }}
          initialMarkdown=""
          runtime={createBlockEditorRuntime()}
          onMarkdownChange={() => undefined}
        />
      </I18nProvider>,
    );

    const editor = screen.getByRole("textbox", { name: /markdown block editor/i });
    editor.focus();

    const repeatedOldDefaultEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "b",
      repeat: true,
    });

    await act(async () => {
      editor.dispatchEvent(repeatedOldDefaultEvent);
    });

    expect(repeatedOldDefaultEvent.defaultPrevented).toBe(true);
    expect(editorRef.current?.getActionState().activeActions["editor.bold"]).toBe(false);
  });

  it("consumes repeated configured format shortcuts without toggling the format again", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          ref={editorRef}
          config={{ shortcuts: { actions: { "editor.bold": "Control+Shift+B" } } }}
          initialMarkdown=""
          runtime={createBlockEditorRuntime()}
          onMarkdownChange={() => undefined}
        />
      </I18nProvider>,
    );

    const editor = screen.getByRole("textbox", { name: /markdown block editor/i });
    editor.focus();

    const configuredEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "b",
      shiftKey: true,
    });
    const repeatedConfiguredEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "b",
      repeat: true,
      shiftKey: true,
    });

    await act(async () => {
      editor.dispatchEvent(configuredEvent);
    });

    expect(editorRef.current?.getActionState().activeActions["editor.bold"]).toBe(true);

    await act(async () => {
      editor.dispatchEvent(repeatedConfiguredEvent);
    });

    expect(repeatedConfiguredEvent.defaultPrevented).toBe(true);
    expect(editorRef.current?.getActionState().activeActions["editor.bold"]).toBe(true);
  });

  it("opens the link editor and focuses the URL input after creating a link", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          ref={editorRef}
          initialMarkdown="Alpha"
          runtime={createBlockEditorRuntime()}
          onMarkdownChange={() => undefined}
        />
      </I18nProvider>,
    );

    const editor = screen.getByRole("textbox", { name: /markdown block editor/i });
    editor.focus();
    selectEditorText(editor, "Alpha");

    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    await act(async () => {
      editorRef.current?.executeAction("editor.link");
    });

    const urlInput = await screen.findByRole("textbox", { name: "Link URL" });
    await waitFor(() => expect(urlInput).toHaveFocus());
  });

  it("lets users copy code from code block controls", async () => {
    const user = userEvent.setup();
    const runtime = createBlockEditorRuntime();

    render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          config={{ markdown: { codeBlock: { showLineNumbers: true } } }}
          initialMarkdown={["```ts", "const value = 1;", "```", ""].join("\n")}
          runtime={runtime}
          onMarkdownChange={() => undefined}
        />
      </I18nProvider>,
    );

    await flushAnimationFrames(3);
    window.dispatchEvent(new Event("resize"));
    await flushAnimationFrames(1);

    await user.click(screen.getByRole("button", { name: /copy code/i }));

    expect(runtime.clipboard.writeText).toHaveBeenCalledWith("const value = 1;");
  });
});
