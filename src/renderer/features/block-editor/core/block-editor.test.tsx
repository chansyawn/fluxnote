// @vitest-environment jsdom

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { createBlockEditorRuntime } from "../test-helper/editor-driver";
import { BlockEditor } from "./block-editor";

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@renderer/app/theme", () => ({
  useThemeState: () => ({
    resolvedTheme: "light",
    setThemeMode: () => undefined,
    themeMode: "light",
  }),
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

  it("lets users copy code from code block controls", async () => {
    const user = userEvent.setup();
    const runtime = createBlockEditorRuntime();

    render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          config={{ markdown: { codeBlock: { showLineNumbers: true, wordWrap: true } } }}
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
