// @vitest-environment jsdom

import type { Block, Tag } from "@renderer/clients";
import type { ReactElement, ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

type MockChildrenProps = {
  children?: ReactNode;
};

type MockButtonProps = MockChildrenProps & {
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button";
};

type MockRenderProps = MockChildrenProps & {
  "aria-label"?: string;
  disabled?: boolean;
  render?: ReactElement<MockButtonProps>;
  trigger?: ReactNode;
};

vi.mock("@lingui/react", () => ({
  useLingui: () => ({
    i18n: {
      _: ({ message }: { message: string }) => message,
    },
  }),
}));

vi.mock("@lingui/react/macro", async () => {
  const React = await import("react");

  return {
    Trans: ({ children }: MockChildrenProps) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("@renderer/features/tag/tag-combobox-popover", async () => {
  const React = await import("react");

  return {
    TagComboboxPopover: ({ disabled, trigger }: MockRenderProps) =>
      React.createElement(
        "button",
        {
          disabled,
          type: "button",
        },
        trigger,
      ),
  };
});

vi.mock("@renderer/ui/components/button", async () => {
  const React = await import("react");

  return {
    Button: ({ children, disabled, onClick, ...props }: MockButtonProps) =>
      React.createElement(
        "button",
        {
          "aria-label": props["aria-label"],
          "aria-pressed": props["aria-pressed"],
          disabled,
          onClick,
          type: "button",
        },
        children,
      ),
  };
});

vi.mock("@renderer/ui/components/dropdown-menu", async () => {
  const React = await import("react");

  function renderWithTrigger({
    children,
    disabled,
    render,
    ...props
  }: MockRenderProps): ReactElement {
    if (render) {
      return React.cloneElement(render, {
        "aria-label": props["aria-label"],
        children,
        disabled,
      });
    }

    return React.createElement("button", { disabled, type: "button" }, children);
  }

  return {
    DropdownMenu: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
    DropdownMenuContent: ({ children }: MockChildrenProps) =>
      React.createElement("div", null, children),
    DropdownMenuGroup: ({ children }: MockChildrenProps) =>
      React.createElement("div", null, children),
    DropdownMenuItem: ({ children, disabled, onClick }: MockButtonProps) =>
      React.createElement("button", { disabled, onClick, type: "button" }, children),
    DropdownMenuLabel: ({ children }: MockChildrenProps) =>
      React.createElement("div", null, children),
    DropdownMenuSeparator: () => React.createElement("hr"),
    DropdownMenuShortcut: ({ children }: MockChildrenProps) =>
      React.createElement("span", null, children),
    DropdownMenuTrigger: renderWithTrigger,
  };
});

vi.mock("@renderer/ui/components/tooltip", async () => {
  const React = await import("react");

  return {
    Tooltip: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
    TooltipContent: ({ children }: MockChildrenProps) => React.createElement("div", null, children),
    TooltipTrigger: ({ children, render }: MockRenderProps) => {
      if (render) {
        return React.cloneElement(render, { children });
      }

      return React.createElement("button", { type: "button" }, children);
    },
  };
});

import { BlockActions, type ProtectedKeepReason } from "./block-actions";

function createBlock(overrides?: Partial<Block>): Block {
  return {
    archivedAt: null,
    content: "",
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "block-1",
    isKept: false,
    isPinned: false,
    orderIndex: 0,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    willArchive: false,
    ...overrides,
  };
}

function createHandlers() {
  return {
    onAssignTags: vi.fn(async () => undefined),
    onCopy: vi.fn(async () => undefined),
    onCreateTag: vi.fn(async () => undefined),
    onDelete: vi.fn(async () => undefined),
    onReorder: vi.fn(async () => undefined),
    onToggleArchive: vi.fn(async () => undefined),
    onToggleKeep: vi.fn(async () => undefined),
    onTogglePinned: vi.fn(async () => undefined),
  };
}

function renderBlockActions({
  block = createBlock(),
  protectedKeepReason = null,
}: {
  block?: Block;
  protectedKeepReason?: ProtectedKeepReason;
}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const handlers = createHandlers();

  act(() => {
    root.render(
      <BlockActions
        block={block}
        position={{ canMoveDown: true, canMoveToTop: true, canMoveUp: true }}
        state={{
          protectedKeepReason,
          tags: [] satisfies Tag[],
        }}
        handlers={handlers}
      />,
    );
  });

  return { container, handlers, root };
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!button) {
    throw new Error(`Button with text "${text}" was not rendered.`);
  }

  return button;
}

describe("BlockActions", () => {
  let mountedRoot: Root | null = null;
  let mountedContainer: HTMLElement | null = null;

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    mountedContainer?.remove();
    mountedContainer = null;
  });

  it("disables keep and archive for external edit blocks", () => {
    const rendered = renderBlockActions({ protectedKeepReason: "external-edit" });
    mountedRoot = rendered.root;
    mountedContainer = rendered.container;

    expect(findButtonByText(rendered.container, "External edit keeps this block").disabled).toBe(
      true,
    );
    expect(findButtonByText(rendered.container, "Archive block").disabled).toBe(true);
  });

  it("disables keep with pinned protection copy", () => {
    const rendered = renderBlockActions({
      block: createBlock({ isPinned: true }),
      protectedKeepReason: "pinned",
    });
    mountedRoot = rendered.root;
    mountedContainer = rendered.container;

    expect(findButtonByText(rendered.container, "Pin keeps this block").disabled).toBe(true);
    expect(findButtonByText(rendered.container, "Archive block").disabled).toBe(false);
  });
});
