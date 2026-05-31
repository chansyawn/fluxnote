// @vitest-environment jsdom

import type { BlockEditorHandle } from "@renderer/features/block-editor/core/types";
import {
  findBlockEditor,
  renderBlockEditor,
} from "@renderer/features/block-editor/test/block-editor-test-utils";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

const SIMPLE_TABLE_MARKDOWN = ["| Name | Status |", "| --- | --- |", "| Alpha | Ready |"].join(
  "\n",
);

async function showColumnMenu(container: HTMLElement) {
  await findBlockEditor(container);
  const firstHeader = await screen.findByRole("columnheader", { name: "Name" });
  vi.spyOn(firstHeader, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 20, 100, 28));

  await act(async () => {
    firstHeader.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 24,
      }),
    );
  });

  fireEvent.mouseDown(await screen.findByRole("button", { name: "Open column actions menu" }));
  await screen.findByRole("menuitem", { name: "Insert column right" });
}

async function showRowMenu(container: HTMLElement) {
  await findBlockEditor(container);
  const firstDataCell = await screen.findByRole("cell", { name: "Alpha" });
  vi.spyOn(firstDataCell, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 48, 100, 28));

  await act(async () => {
    firstDataCell.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 52,
      }),
    );
  });

  fireEvent.mouseDown(await screen.findByRole("button", { name: "Open row actions menu" }));
  await screen.findByRole("menuitem", { name: "Insert row below" });
}

describe("table plugin", () => {
  it("renders table action menus for Markdown tables", async () => {
    const { container } = renderBlockEditor({ initialMarkdown: SIMPLE_TABLE_MARKDOWN });

    await showColumnMenu(container);

    expect(screen.getByRole("menuitem", { name: "Insert column right" })).toBeVisible();
    expect(screen.getByRole("menuitemradio", { name: "Align center" })).toBeVisible();
  });

  it("keeps the row handle pinned to the visible table edge when horizontally scrolled", async () => {
    const { container } = renderBlockEditor({ initialMarkdown: SIMPLE_TABLE_MARKDOWN });
    await findBlockEditor(container);

    const table = await screen.findByRole("table");
    const firstHeader = await screen.findByRole("columnheader", { name: "Name" });
    const firstDataCell = await screen.findByRole("cell", { name: "Alpha" });

    vi.spyOn(table, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 20, 240, 56));
    vi.spyOn(firstHeader, "getBoundingClientRect").mockReturnValue(new DOMRect(-40, 20, 100, 28));
    vi.spyOn(firstDataCell, "getBoundingClientRect").mockReturnValue(new DOMRect(-40, 48, 100, 28));

    await act(async () => {
      firstDataCell.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: 24,
          clientY: 52,
        }),
      );
    });

    expect(await screen.findByRole("button", { name: "Open row actions menu" })).toHaveStyle({
      insetInlineStart: "20px",
    });
    expect(screen.getByRole("button", { name: "Open column actions menu" })).toHaveStyle({
      insetInlineStart: "10px",
    });
  });

  it("inserts columns from the column menu", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: SIMPLE_TABLE_MARKDOWN }, editorRef);
    await showColumnMenu(container);

    await userEvent.click(screen.getByRole("menuitem", { name: "Insert column right" }));

    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain("| Name  | <br /> | Status |");
    });
  });

  it("sets column alignment from the column menu", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: SIMPLE_TABLE_MARKDOWN }, editorRef);
    await showColumnMenu(container);

    await userEvent.click(screen.getByRole("menuitemradio", { name: "Align center" }));

    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain("| :---: | ------ |");
    });
  });

  it("inserts rows from the row menu", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: SIMPLE_TABLE_MARKDOWN }, editorRef);
    await showRowMenu(container);

    await userEvent.click(screen.getByRole("menuitem", { name: "Insert row below" }));

    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain(
        "| Alpha  | Ready  |\n| <br /> | <br /> |",
      );
    });
  });
});
