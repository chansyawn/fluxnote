// @vitest-environment jsdom

import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const iconActionMock = vi.hoisted(() => vi.fn());

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children?: ReactNode }) => children ?? null,
}));

vi.mock("./icon-action", () => ({
  IconAction: (props: unknown) => {
    iconActionMock(props);
    return null;
  },
}));

import { ExternalEditActions } from "./external-edit-actions";

describe("ExternalEditActions", () => {
  afterEach(() => {
    iconActionMock.mockReset();
  });

  it("passes external edit shortcuts into icon actions", () => {
    const shortcuts: Pick<ShortcutPreferences, "submit-external-edit" | "cancel-external-edit"> = {
      "cancel-external-edit": "Mod+\\",
      "submit-external-edit": "Mod+Enter",
    };

    const { unmount } = renderExternalEditActions({ shortcuts });

    expect(iconActionMock).toHaveBeenCalledTimes(2);
    expect(iconActionMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        shortcut: "Mod+Enter",
      }),
    );
    expect(iconActionMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        shortcut: "Mod+\\",
      }),
    );

    unmount();
  });
});

function renderExternalEditActions({
  shortcuts,
}: {
  shortcuts: Pick<ShortcutPreferences, "submit-external-edit" | "cancel-external-edit">;
}) {
  const container = document.createElement("div");
  document.body.append(container);
  const reactRoot = createRoot(container);

  act(() => {
    reactRoot.render(
      <ExternalEditActions
        shortcuts={shortcuts}
        onCancel={() => undefined}
        onSubmit={() => undefined}
      />,
    );
  });

  return {
    unmount: () => {
      act(() => {
        reactRoot.unmount();
      });
      container.remove();
    },
  };
}
