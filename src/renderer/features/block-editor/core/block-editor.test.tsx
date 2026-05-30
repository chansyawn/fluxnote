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

  await screen.findByRole("button", { name: "Open" });
  return link;
}

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

async function findEditor(container: HTMLElement): Promise<HTMLElement> {
  await waitFor(() => {
    expect(container.querySelector(".block-editor__content")).toBeInTheDocument();
  });

  return container.querySelector<HTMLElement>(".block-editor__content") as HTMLElement;
}

describe("BlockEditor", () => {
  it("exposes a labeled editing surface for a Block", async () => {
    const { container } = renderEditor({ initialMarkdown: "Hello" });

    expect(await findEditor(container)).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeVisible();
  });

  it("flushes the latest Markdown through the public handle", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderEditor({ initialMarkdown: "**Hello**" }, editorRef);
    await findEditor(container);

    await expect(editorRef.current?.flush()).resolves.toContain("Hello");
  });

  it("applies configured Block Editor text format shortcuts", async () => {
    const editorRef = createRef<BlockEditorHandle>();

    const { container } = renderEditor(
      {
        config: { shortcuts: { textFormats: { bold: "Control+Shift+B" } } },
        initialMarkdown: "",
      },
      editorRef,
    );
    const editor = await findEditor(container);
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

    const { container } = renderEditor(
      {
        config: { shortcuts: { textFormats: { bold: null } } },
        initialMarkdown: "Plain text",
      },
      editorRef,
    );
    const editor = await findEditor(container);
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

    const { container } = renderEditor(
      {
        initialMarkdown: "![Alt](assets://block/photo.png)",
        runtime,
      },
      editorRef,
    );
    await findEditor(container);

    await editorRef.current?.copy();

    expect(runtime.clipboard.write).toHaveBeenCalledWith(
      expect.objectContaining({
        imageFileUrl: "file:///tmp/photo.png",
        text: expect.stringContaining("assets://block/photo.png"),
      }),
    );
  });

  it("copies code block text through the code block controls", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderEditor({
      initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      runtime,
    });
    await findEditor(container);

    await userEvent.click(await screen.findByRole("button", { name: "Copy code" }));

    expect(runtime.clipboard.writeText).toHaveBeenCalledWith("const answer = 42;");
    expect(await screen.findByRole("button", { name: "Copy code" })).toBeVisible();
  });

  it("updates a code block language through the code block controls", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderEditor(
      {
        initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      },
      editorRef,
    );
    await findEditor(container);

    await userEvent.click(await screen.findByRole("combobox", { name: "Code language" }));
    await userEvent.click(await screen.findByRole("option", { name: "Python" }));

    await expect(editorRef.current?.flush()).resolves.toContain("```python");
  });

  it("renders code block line numbers when the Markdown preference is enabled", async () => {
    const { container } = renderEditor({
      config: { markdown: { codeBlock: { showLineNumbers: true } } },
      initialMarkdown: ["```ts", "const answer = 42;", "answer;", "```"].join("\n"),
    });
    await findEditor(container);

    await waitFor(() => {
      expect(container.querySelectorAll("pre .line-number")).toHaveLength(2);
    });
  });

  it("notifies Markdown changes from user editing", async () => {
    const user = userEvent.setup();
    const onMarkdownChange = vi.fn();

    const { container } = renderEditor({ initialMarkdown: "", onMarkdownChange });
    const editor = await findEditor(container);

    await user.click(editor);
    await user.keyboard("Hello");

    await waitFor(() => {
      expect(onMarkdownChange).toHaveBeenCalledWith(expect.stringContaining("Hello"));
    });
  });

  it("renders task list items from Markdown", async () => {
    const { container } = renderEditor({
      initialMarkdown: "- [ ] Open task\n- [x] Closed task",
    });
    await findEditor(container);

    expect(
      container.querySelector('li[data-item-type="task"][data-checked="false"]'),
    ).toHaveTextContent("Open task");
    expect(
      container.querySelector('li[data-item-type="task"][data-checked="true"]'),
    ).toHaveTextContent("Closed task");
  });

  it("toggles a task list item when the checkbox marker is clicked", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderEditor({ initialMarkdown: "- [ ] Open task" }, editorRef);
    await findEditor(container);
    const taskItem = container.querySelector<HTMLElement>('li[data-item-type="task"]');
    expect(taskItem).not.toBeNull();

    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = ((element: Element, pseudoElement?: string | null) => {
      const declaration = originalGetComputedStyle(element, pseudoElement);
      if (element === taskItem) {
        Object.defineProperty(declaration, "fontSize", { configurable: true, value: "16px" });
        Object.defineProperty(declaration, "lineHeight", { configurable: true, value: "24px" });
      }
      return declaration;
    }) as typeof window.getComputedStyle;
    vi.spyOn(taskItem as HTMLElement, "getBoundingClientRect").mockReturnValue(
      new DOMRect(24, 0, 200, 24),
    );

    await act(async () => {
      taskItem?.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: 6,
          clientY: 12,
        }),
      );
    });
    window.getComputedStyle = originalGetComputedStyle;

    expect(await editorRef.current?.flush()).toContain("* [x] Open task");
  });

  it("does not toggle a task list item when its text is clicked", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderEditor({ initialMarkdown: "- [ ] Open task" }, editorRef);
    await findEditor(container);
    const taskItem = container.querySelector<HTMLElement>('li[data-item-type="task"]');
    expect(taskItem).not.toBeNull();

    vi.spyOn(taskItem as HTMLElement, "getBoundingClientRect").mockReturnValue(
      new DOMRect(24, 0, 200, 24),
    );

    await act(async () => {
      taskItem?.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: 80,
          clientY: 12,
        }),
      );
    });

    expect(await editorRef.current?.flush()).toContain("* [ ] Open task");
  });

  it("opens a hovered link through the runtime", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
      runtime,
    });
    await findEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(runtime.links.openExternal).toHaveBeenCalledWith("https://example.com");
  });

  it("copies a hovered link through the runtime", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
      runtime,
    });
    await findEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(runtime.clipboard.writeText).toHaveBeenCalledWith("https://example.com");
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
  });

  it("edits a hovered link url", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderEditor(
      {
        initialMarkdown: "[Fluxnotes](https://example.com)",
      },
      editorRef,
    );
    await findEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByRole("textbox", { name: "Link URL" });
    await userEvent.clear(input);
    await userEvent.type(input, "https://fluxnotes.local");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await expect(editorRef.current?.flush()).resolves.toContain(
      "[Fluxnotes](https://fluxnotes.local)",
    );
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
  });

  it("removes a hovered link while keeping its text", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderEditor(
      {
        initialMarkdown: "[Fluxnotes](https://example.com)",
      },
      editorRef,
    );
    await findEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await expect(editorRef.current?.flush()).resolves.toContain("Fluxnotes");
    await expect(editorRef.current?.flush()).resolves.not.toContain("https://example.com");
  });

  it("creates unchecked tasks from empty bracket shorthand inside list items", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderEditor({ initialMarkdown: "" }, editorRef);
    const editor = await findEditor(container);

    await user.click(editor);
    await user.keyboard("- [[");
    await user.keyboard("]");
    await user.keyboard(" Task");

    await waitFor(() => {
      expect(container.querySelector('li[data-item-type="task"]')).toHaveTextContent("Task");
    });
    expect(await editorRef.current?.flush()).toContain("* [ ] Task");
  });

  it.each([
    ["empty brackets", ["[[", "]", " Task"], "* [ ] Task"],
    ["spaced empty brackets", ["[[", " ]", " Task"], "* [ ] Task"],
    ["checked brackets", ["[[", "x]", " Task"], "* [x] Task"],
  ])(
    "creates task list items from %s at the start of a paragraph",
    async (_name, keys, markdown) => {
      const user = userEvent.setup();
      const editorRef = createRef<BlockEditorHandle>();
      const { container } = renderEditor({ initialMarkdown: "" }, editorRef);
      const editor = await findEditor(container);

      await user.click(editor);
      for (const keyText of keys) {
        await user.keyboard(keyText);
      }

      await waitFor(() => {
        expect(container.querySelector('li[data-item-type="task"]')).toHaveTextContent("Task");
      });
      expect(await editorRef.current?.flush()).toContain(markdown);
    },
  );

  it("keeps task shorthand as text when typed in the middle of a paragraph", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderEditor({ initialMarkdown: "" }, editorRef);
    const editor = await findEditor(container);

    await user.click(editor);
    await user.keyboard("Before [[");
    await user.keyboard("]");
    await user.keyboard(" after");

    await waitFor(() => {
      expect(editor).toHaveTextContent("Before [] after");
    });
    expect(await editorRef.current?.flush()).toContain("Before \\[] after");
  });

  it("keeps the active editor mounted when the initial Markdown prop changes", async () => {
    const onMarkdownChange = vi.fn();
    const runtime = createBlockEditorRuntime();
    const editorRef = createRef<BlockEditorHandle>();
    const { container, rerender } = renderEditor(
      {
        initialMarkdown: "Local content",
        onMarkdownChange,
        runtime,
      },
      editorRef,
    );
    const editor = await findEditor(container);

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
