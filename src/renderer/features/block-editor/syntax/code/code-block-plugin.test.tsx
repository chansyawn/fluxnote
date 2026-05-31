// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import type { BlockEditorHandle } from "../../core/types";
import {
  createBlockEditorRuntime,
  findBlockEditor,
  renderBlockEditor,
} from "../../test/block-editor-test-utils";

describe("code block plugin", () => {
  it("copies code block text through the code block controls", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderBlockEditor({
      initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      runtime,
    });
    await findBlockEditor(container);

    await userEvent.click(await screen.findByRole("button", { name: "Copy code" }));

    expect(runtime.clipboard.writeText).toHaveBeenCalledWith("const answer = 42;");
    expect(await screen.findByRole("button", { name: "Copy code" })).toBeVisible();
  });

  it("updates a code block language through the code block controls", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      },
      editorRef,
    );
    await findBlockEditor(container);

    await userEvent.click(await screen.findByRole("combobox", { name: "Code language" }));
    await userEvent.click(await screen.findByRole("option", { name: "Python" }));

    await expect(editorRef.current?.flush()).resolves.toContain("```python");
  });

  it("renders code block line numbers when the Markdown preference is enabled", async () => {
    const { container } = renderBlockEditor({
      config: { markdown: { codeBlock: { showLineNumbers: true } } },
      initialMarkdown: ["```ts", "const answer = 42;", "answer;", "```"].join("\n"),
    });
    await findBlockEditor(container);

    await waitFor(() => {
      expect(container.querySelectorAll("pre .line-number")).toHaveLength(2);
    });
  });

  it("configures code highlighting before the highlight plugin starts", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const { container } = renderBlockEditor({
        config: { markdown: { codeBlock: { showLineNumbers: true } } },
        initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      });
      await findBlockEditor(container);

      await waitFor(() => {
        expect(container.querySelectorAll("pre .line-number")).toHaveLength(1);
      });

      const consoleOutput = consoleError.mock.calls.flat().map(String).join("\n");
      expect(consoleOutput).not.toContain(
        "Highlight plugin requires a parser to be set in the highlightPluginConfig.",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
