// @vitest-environment jsdom

import type { Tag } from "@renderer/clients";
import { createRendererBlock } from "@renderer/test/fixtures";
import { renderWithProviders } from "@renderer/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

type MockChildrenProps = {
  children?: ReactNode;
};

type MockTagComboboxPopoverProps = {
  disabled?: boolean;
  trigger: ReactNode;
};

type MockMenuItemProps = MockChildrenProps & {
  disabled?: boolean;
  onClick?: () => void;
};

type MockMenuTriggerProps = MockChildrenProps & {
  "aria-label"?: string;
  disabled?: boolean;
  render?: React.ReactElement<Record<string, unknown>>;
};

vi.mock("@lingui/react/macro", async () => {
  const React = await import("react");

  return {
    Trans: ({ children }: MockChildrenProps) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock("@renderer/features/tag/tag-combobox-popover", async () => {
  const React = await import("react");

  return {
    TagComboboxPopover: ({ disabled, trigger }: MockTagComboboxPopoverProps) =>
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

vi.mock("@renderer/ui/components/dropdown-menu", async () => {
  const React = await import("react");

  return {
    DropdownMenu: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
    DropdownMenuContent: ({ children }: MockChildrenProps) =>
      React.createElement("div", { role: "menu" }, children),
    DropdownMenuGroup: ({ children }: MockChildrenProps) =>
      React.createElement(React.Fragment, null, children),
    DropdownMenuItem: ({ children, disabled, onClick }: MockMenuItemProps) =>
      React.createElement(
        "button",
        {
          "data-disabled": disabled ? "" : undefined,
          disabled,
          onClick,
          role: "menuitem",
          type: "button",
        },
        children,
      ),
    DropdownMenuLabel: ({ children }: MockChildrenProps) =>
      React.createElement("div", null, children),
    DropdownMenuSeparator: () => React.createElement("hr"),
    DropdownMenuShortcut: ({ children }: MockChildrenProps) =>
      React.createElement("span", null, children),
    DropdownMenuTrigger: ({
      "aria-label": ariaLabel,
      children,
      disabled,
      render,
    }: MockMenuTriggerProps) => {
      if (render) {
        return React.cloneElement(render, {
          "aria-label": ariaLabel,
          children,
          disabled,
        });
      }

      return React.createElement(
        "button",
        { "aria-label": ariaLabel, disabled, type: "button" },
        children,
      );
    },
  };
});

import { BlockActions, type AutoArchiveProtectionReason } from "./block-actions";

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
  autoArchiveProtectionReason = null,
}: {
  autoArchiveProtectionReason?: AutoArchiveProtectionReason;
} = {}) {
  const handlers = createHandlers();
  renderWithProviders(
    <BlockActions
      block={createRendererBlock({ isPinned: autoArchiveProtectionReason === "pinned" })}
      handlers={handlers}
      position={{ canMoveDown: true, canMoveToTop: true, canMoveUp: true }}
      state={{
        autoArchiveProtectionReason,
        tags: [] satisfies Tag[],
      }}
    />,
  );
  return { handlers };
}

describe("BlockActions", () => {
  it("prevents archived and kept state changes while a Block has an External Edit Session", async () => {
    renderBlockActions({ autoArchiveProtectionReason: "external-edit" });
    const user = userEvent.setup();

    expect(
      screen.getByRole("menuitem", {
        name: /External edit protects this block from auto archive/,
      }),
    ).toHaveAttribute("data-disabled");
    expect(screen.getByRole("button", { name: "Archive block" })).toBeDisabled();

    await user.click(
      screen.getByRole("menuitem", {
        name: /External edit protects this block from auto archive/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Archive block" }));
  });

  it("explains that a Pinned Block is already protected from Auto Archive", async () => {
    const { handlers } = renderBlockActions({ autoArchiveProtectionReason: "pinned" });
    const user = userEvent.setup();

    expect(
      screen.getByRole("menuitem", {
        name: /Pinned blocks are protected from auto archive/,
      }),
    ).toHaveAttribute("data-disabled");
    expect(screen.getByRole("button", { name: "Archive block" })).toBeEnabled();

    await user.click(screen.getByRole("menuitem", { name: "Unpin from top" }));
    await user.click(screen.getByRole("button", { name: "Archive block" }));

    expect(handlers.onTogglePinned).toHaveBeenCalledOnce();
    expect(handlers.onToggleArchive).toHaveBeenCalledOnce();
    expect(handlers.onToggleKeep).not.toHaveBeenCalled();
  });
});
