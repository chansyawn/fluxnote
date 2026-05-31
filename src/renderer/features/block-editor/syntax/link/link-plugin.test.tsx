// @vitest-environment jsdom

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { BlockEditor } from "@renderer/features/block-editor/core/block-editor";
import type {
  BlockEditorHandle,
  BlockEditorRuntime,
} from "@renderer/features/block-editor/core/types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef, type ComponentProps, type ReactNode, type Ref } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";

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

afterEach(() => {
  vi.useRealTimers();
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

describe("link plugin", () => {
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

  it("keeps the link popover open when the pointer returns before hover close", async () => {
    const { container } = renderEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
    });
    const editor = await findEditor(container);
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

  it("keeps editing a pinned link when the pointer moves back to the anchor", async () => {
    const { container } = renderEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
    });
    const editor = await findEditor(container);
    const link = await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
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
});
