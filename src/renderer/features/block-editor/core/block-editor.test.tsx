// @vitest-environment jsdom

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef, type ComponentProps, type ReactNode, type Ref } from "react";
import { beforeAll, describe, expect, it, vi } from "vite-plus/test";

import { BlockEditor } from "./block-editor";
import type { BlockEditorHandle, BlockEditorRuntime } from "./types";

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

i18n.load("en", {});
i18n.activate("en");

beforeAll(() => {
  document.elementFromPoint = () => document.activeElement;
  HTMLElement.prototype.getClientRects = function getClientRects() {
    return {
      0: this.getBoundingClientRect(),
      item: (index: number) => (index === 0 ? this.getBoundingClientRect() : null),
      length: 1,
      [Symbol.iterator]: function* iterateRects() {
        yield this[0];
      },
    } as DOMRectList;
  };
  Range.prototype.getClientRects = () =>
    ({
      0: new DOMRect(0, 0, 0, 0),
      item: (index: number) => (index === 0 ? new DOMRect(0, 0, 0, 0) : null),
      length: 1,
      [Symbol.iterator]: function* iterateRects() {
        yield this[0];
      },
    }) as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
});

function createBlockEditorRuntime(): BlockEditorRuntime {
  return {
    assets: {
      copy: vi.fn(async () => ({ assets: [] })),
      create: vi.fn(async () => ({ assets: [] })),
      resolve: vi.fn(async () => ({ assets: [] })),
    },
    clipboard: {
      write: vi.fn(async () => undefined),
      writeText: vi.fn(async () => undefined),
    },
    links: {
      openExternal: vi.fn(async () => undefined),
    },
  };
}

function renderEditor(
  props: Partial<ComponentProps<typeof BlockEditor>> = {},
  ref?: Ref<BlockEditorHandle>,
) {
  const runtime = props.runtime ?? createBlockEditorRuntime();
  const onMarkdownChange = props.onMarkdownChange ?? (() => undefined);

  const rendered = render(
    <I18nProvider i18n={i18n}>
      <BlockEditor
        ref={ref}
        initialMarkdown={props.initialMarkdown ?? ""}
        runtime={runtime}
        onMarkdownChange={onMarkdownChange}
        config={props.config}
        onBlur={props.onBlur}
      />
    </I18nProvider>,
  );

  return { runtime, ...rendered };
}

async function findEditor(): Promise<HTMLElement> {
  return await screen.findByRole("textbox", { name: /markdown block editor/i });
}

describe("BlockEditor", () => {
  it("exposes a labeled editing surface for a Block", async () => {
    renderEditor({ initialMarkdown: "Hello" });

    expect(await findEditor()).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeVisible();
  });

  it("flushes the latest Markdown through the public handle", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    renderEditor({ initialMarkdown: "**Hello**" }, editorRef);
    await findEditor();

    await expect(editorRef.current?.flush()).resolves.toContain("Hello");
  });

  it("applies configured Block Editor text format shortcuts", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    renderEditor(
      {
        config: { shortcuts: { textFormats: { bold: "Control+Shift+B" } } },
        initialMarkdown: "",
      },
      editorRef,
    );

    const editor = await findEditor();
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

    renderEditor(
      {
        config: { shortcuts: { textFormats: { bold: null } } },
        initialMarkdown: "Plain text",
      },
      editorRef,
    );

    const editor = await findEditor();
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

    expect(boldEvent.defaultPrevented).toBe(true);
    expect(editorRef.current?.getToolbarState().textFormats.bold).toBe(false);
  });

  it("copies Markdown content through the runtime clipboard", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const runtime = createBlockEditorRuntime();
    runtime.assets.resolve = vi.fn(async () => ({
      assets: [{ assetUrl: "assets://block/photo.png", fileUrl: "file:///tmp/photo.png" }],
    }));

    renderEditor(
      {
        initialMarkdown: "![Alt](assets://block/photo.png)",
        runtime,
      },
      editorRef,
    );
    await findEditor();

    await editorRef.current?.copy();

    expect(runtime.clipboard.write).toHaveBeenCalledWith(
      expect.objectContaining({
        imageFileUrl: "file:///tmp/photo.png",
        text: expect.stringContaining("assets://block/photo.png"),
      }),
    );
  });

  it("notifies Markdown changes from user editing", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();

    renderEditor({ initialMarkdown: "", onMarkdownChange });
    const editor = await findEditor();

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
    const { rerender } = renderEditor(
      {
        initialMarkdown: "Local content",
        onMarkdownChange,
        runtime,
      },
      editorRef,
    );
    const editor = await findEditor();

    editor.focus();

    rerender(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          ref={editorRef}
          initialMarkdown="Persisted content"
          runtime={runtime}
          onMarkdownChange={onMarkdownChange}
        />
      </I18nProvider>,
    );

    expect(document.activeElement).toBe(editor);
    expect(screen.getByText("Local content")).toBeVisible();
    expect(screen.queryByText("Persisted content")).not.toBeInTheDocument();
  });
});
