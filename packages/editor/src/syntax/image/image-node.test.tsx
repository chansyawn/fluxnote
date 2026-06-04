// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { BlockEditor } from "../../core/block-editor";
import type { BlockEditorHandle } from "../../core/types";
import { createBlockEditorRuntime } from "../../test-helper/editor-driver";
import { renderWithProviders } from "../../test-helper/render";

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("ImageNode", () => {
  it("renders asset urls with runtime display urls without changing markdown", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const runtime = createBlockEditorRuntime({
      assets: {
        renderAssetUrls: vi.fn(async () => [
          {
            assetUrl: "assets://block/photo.png",
            renderUrl: "data:image/png;base64,cGhvdG8=",
          },
        ]),
      },
    });

    renderWithProviders(
      <BlockEditor
        ref={editorRef}
        initialMarkdown="![Photo](assets://block/photo.png)"
        runtime={runtime}
        onMarkdownChange={() => undefined}
      />,
    );

    const image = await screen.findByAltText("Photo");
    await waitFor(() => expect(image).toHaveAttribute("src", "data:image/png;base64,cGhvdG8="));
    await waitFor(() => expect(editorRef.current).not.toBeNull());

    await expect(editorRef.current?.flush()).resolves.toContain("assets://block/photo.png");
    expect(runtime.assets.renderAssetUrls).toHaveBeenCalledWith(["assets://block/photo.png"]);
  });

  it("keeps asset urls unchanged when runtime has no display url renderer", async () => {
    renderWithProviders(
      <BlockEditor
        initialMarkdown="![Photo](assets://block/photo.png)"
        runtime={createBlockEditorRuntime()}
        onMarkdownChange={() => undefined}
      />,
    );

    expect(await screen.findByAltText("Photo")).toHaveAttribute("src", "assets://block/photo.png");
  });

  it("does not render ordinary image urls through the runtime", async () => {
    const runtime = createBlockEditorRuntime({
      assets: {
        renderAssetUrls: vi.fn(async () => []),
      },
    });

    renderWithProviders(
      <BlockEditor
        initialMarkdown="![Photo](https://example.com/photo.png)"
        runtime={runtime}
        onMarkdownChange={() => undefined}
      />,
    );

    expect(await screen.findByAltText("Photo")).toHaveAttribute(
      "src",
      "https://example.com/photo.png",
    );
    expect(runtime.assets.renderAssetUrls).not.toHaveBeenCalled();
  });

  it("keeps asset urls unchanged when display url rendering fails", async () => {
    const runtime = createBlockEditorRuntime({
      assets: {
        renderAssetUrls: vi.fn(async () => {
          throw new Error("Unable to render asset url.");
        }),
      },
    });

    renderWithProviders(
      <BlockEditor
        initialMarkdown="![Photo](assets://block/photo.png)"
        runtime={runtime}
        onMarkdownChange={() => undefined}
      />,
    );

    expect(await screen.findByAltText("Photo")).toHaveAttribute("src", "assets://block/photo.png");
  });
});
