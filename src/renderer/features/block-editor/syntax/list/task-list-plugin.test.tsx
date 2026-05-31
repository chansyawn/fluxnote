// @vitest-environment jsdom

import { waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import type { BlockEditorHandle } from "../../core/types";
import { findBlockEditor, renderBlockEditor } from "../../test/block-editor-test-utils";

describe("task list plugin", () => {
  it("renders task list items from Markdown", async () => {
    const { container } = renderBlockEditor({
      initialMarkdown: "- [ ] Open task\n- [x] Closed task",
    });
    await findBlockEditor(container);

    expect(
      container.querySelector('li[data-item-type="task"][data-checked="false"]'),
    ).toHaveTextContent("Open task");
    expect(
      container.querySelector('li[data-item-type="task"][data-checked="true"]'),
    ).toHaveTextContent("Closed task");
  });

  it("toggles a task list item when the checkbox marker is clicked", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "- [ ] Open task" }, editorRef);
    await findBlockEditor(container);
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
    const { container } = renderBlockEditor({ initialMarkdown: "- [ ] Open task" }, editorRef);
    await findBlockEditor(container);
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

  it.each([
    ["empty brackets", ["[[", "]", " Task"], "* [ ] Task"],
    ["spaced empty brackets", ["[[", " ]", " Task"], "* [ ] Task"],
    ["checked brackets", ["[[", "x]", " Task"], "* [x] Task"],
  ])(
    "creates task list items from %s at the start of a paragraph",
    async (_name, keys, markdown) => {
      const user = userEvent.setup();
      const editorRef = createRef<BlockEditorHandle>();
      const { container } = renderBlockEditor({ initialMarkdown: "" }, editorRef);
      const editor = await findBlockEditor(container);

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

  it("creates unchecked tasks from empty bracket shorthand inside list items", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "" }, editorRef);
    const editor = await findBlockEditor(container);

    await user.click(editor);
    await user.keyboard("- [[");
    await user.keyboard("]");
    await user.keyboard(" Task");

    await waitFor(() => {
      expect(container.querySelector('li[data-item-type="task"]')).toHaveTextContent("Task");
    });
    expect(await editorRef.current?.flush()).toContain("* [ ] Task");
  });

  it("keeps task shorthand as text when typed in the middle of a paragraph", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "" }, editorRef);
    const editor = await findBlockEditor(container);

    await user.click(editor);
    await user.keyboard("Before [[");
    await user.keyboard("]");
    await user.keyboard(" after");

    await waitFor(() => {
      expect(editor).toHaveTextContent("Before [] after");
    });
    expect(await editorRef.current?.flush()).toContain("Before \\[] after");
  });
});
