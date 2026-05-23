// @vitest-environment jsdom

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { BlockEditor } from "./block-editor";
import type { BlockEditorRuntime } from "./types";

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

let mountedRoot: Root | null = null;
let mountedContainer: HTMLElement | null = null;

const runtime: BlockEditorRuntime = {
  assets: {
    copy: async ({ assetUrls }) => ({
      assets: assetUrls.map((assetUrl) => ({
        assetUrl,
        sourceAssetUrl: assetUrl,
      })),
    }),
    create: async ({ assets }) => ({
      assets: assets.map((asset, index) => ({
        altText: asset.fileName ?? `image-${index + 1}`,
        assetUrl: `data:${asset.mimeType};base64,${asset.dataBase64}`,
      })),
    }),
    resolve: async ({ assetUrls }) => ({
      assets: assetUrls.map((assetUrl) => ({
        assetUrl,
        fileUrl: assetUrl,
      })),
    }),
  },
  clipboard: {
    write: async () => undefined,
    writeText: async () => undefined,
  },
  links: {
    openExternal: async () => undefined,
  },
};

function renderBlockEditor(initialMarkdown: string): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <I18nProvider i18n={i18n}>
        <BlockEditor
          config={{ markdown: { codeBlock: { showLineNumbers: true, wordWrap: true } } }}
          initialMarkdown={initialMarkdown}
          runtime={runtime}
          onMarkdownChange={() => undefined}
        />
      </I18nProvider>,
    );
  });

  mountedRoot = root;
  mountedContainer = container;
  return container;
}

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
  afterEach(() => {
    if (mountedRoot) {
      act(() => {
        mountedRoot?.unmount();
      });
    }

    mountedRoot = null;
    mountedContainer?.remove();
    mountedContainer = null;
  });

  it("renders code block controls from the provided overlay container", async () => {
    const container = renderBlockEditor("```ts\nconst value = 1;\n```");

    await flushAnimationFrames(3);
    window.dispatchEvent(new Event("resize"));
    await flushAnimationFrames(1);

    const codeBlock = container.querySelector<HTMLElement>(".block-editor__code");
    expect(container.querySelector(".block-editor__code-toolbar")).not.toBeNull();
    expect(container.querySelector(".block-editor__code-line-numbers")).not.toBeNull();
    expect(codeBlock?.classList.contains("block-editor__code--line-numbers")).toBe(true);
    expect(codeBlock?.classList.contains("block-editor__code--word-wrap")).toBe(true);
    expect(container.querySelector(".block-editor__shell")).toBeNull();
  });
});
