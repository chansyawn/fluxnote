import type { I18n } from "@lingui/core";
import { useLingui } from "@lingui/react";
import { Button } from "@renderer/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@renderer/ui/components/dropdown-menu";
import { cn } from "@renderer/ui/lib/utils";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowDownIcon,
  ArrowDownToLineIcon,
  ArrowLeftIcon,
  ArrowLeftToLineIcon,
  ArrowRightIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  ArrowUpToLineIcon,
  TextIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";

import type { TableControlKind, TableControlTarget } from "./table-controls-state";
import type {
  TableColumnAlign,
  TableOperationAction,
  TableStructureOperation,
} from "./table-operations";

interface TableActionDefinition {
  icon: LucideIcon;
  operation: TableStructureOperation;
  isDisabled: (target: TableControlTarget) => boolean;
}

interface TableAlignDefinition {
  align: TableColumnAlign;
  icon: typeof TextIcon;
}

interface TableHandleMenuProps {
  activeMenu: TableControlKind | null;
  kind: TableControlKind;
  onAction: (action: TableOperationAction) => void;
  onOpenChange: (kind: TableControlKind, open: boolean) => void;
  target: TableControlTarget;
}

const TABLE_ACTIONS: Record<TableControlKind, TableActionDefinition[]> = {
  column: [
    {
      icon: ArrowLeftToLineIcon,
      isDisabled: () => false,
      operation: "insert-column-left",
    },
    {
      icon: ArrowRightToLineIcon,
      isDisabled: () => false,
      operation: "insert-column-right",
    },
    {
      icon: ArrowLeftIcon,
      isDisabled: (target) => target.columnIndex <= 0,
      operation: "move-column-left",
    },
    {
      icon: ArrowRightIcon,
      isDisabled: (target) => target.columnIndex >= target.columnCount - 1,
      operation: "move-column-right",
    },
    {
      icon: Trash2Icon,
      isDisabled: (target) => target.columnCount <= 1,
      operation: "delete-column",
    },
  ],
  row: [
    {
      icon: ArrowUpToLineIcon,
      isDisabled: () => false,
      operation: "insert-row-above",
    },
    {
      icon: ArrowDownToLineIcon,
      isDisabled: () => false,
      operation: "insert-row-below",
    },
    {
      icon: ArrowUpIcon,
      isDisabled: (target) => target.rowIndex <= 0,
      operation: "move-row-up",
    },
    {
      icon: ArrowDownIcon,
      isDisabled: (target) => target.rowIndex >= target.rowCount - 1,
      operation: "move-row-down",
    },
    {
      icon: Trash2Icon,
      isDisabled: (target) => target.rowCount <= 1,
      operation: "delete-row",
    },
  ],
};

const TABLE_ALIGNMENTS: TableAlignDefinition[] = [
  { align: "none", icon: TextIcon },
  { align: "left", icon: AlignLeftIcon },
  { align: "center", icon: AlignCenterIcon },
  { align: "right", icon: AlignRightIcon },
];

function isTableColumnAlign(value: string): value is TableColumnAlign {
  return value === "none" || value === "left" || value === "center" || value === "right";
}

function getMenuLabel(i18n: I18n, kind: TableControlKind): string {
  if (kind === "column") {
    return i18n._({
      id: "block-editor.table.column-menu",
      message: "Open column actions menu",
    });
  }

  return i18n._({
    id: "block-editor.table.row-menu",
    message: "Open row actions menu",
  });
}

function getActionLabel(i18n: I18n, operation: TableStructureOperation): string {
  switch (operation) {
    case "insert-column-left":
      return i18n._({
        id: "block-editor.table.insert-column-left",
        message: "Insert column left",
      });
    case "insert-column-right":
      return i18n._({
        id: "block-editor.table.insert-column-right",
        message: "Insert column right",
      });
    case "move-column-left":
      return i18n._({ id: "block-editor.table.move-column-left", message: "Move left" });
    case "move-column-right":
      return i18n._({ id: "block-editor.table.move-column-right", message: "Move right" });
    case "delete-column":
      return i18n._({ id: "block-editor.table.delete-column", message: "Delete column" });
    case "insert-row-above":
      return i18n._({ id: "block-editor.table.insert-row-above", message: "Insert row above" });
    case "insert-row-below":
      return i18n._({ id: "block-editor.table.insert-row-below", message: "Insert row below" });
    case "move-row-up":
      return i18n._({ id: "block-editor.table.move-row-up", message: "Move up" });
    case "move-row-down":
      return i18n._({ id: "block-editor.table.move-row-down", message: "Move down" });
    case "delete-row":
      return i18n._({ id: "block-editor.table.delete-row", message: "Delete row" });
  }
}

function getAlignmentLabel(i18n: I18n, align: TableColumnAlign): string {
  switch (align) {
    case "none":
      return i18n._({ id: "block-editor.table.align-default", message: "Default" });
    case "left":
      return i18n._({ id: "block-editor.table.align-left", message: "Align left" });
    case "center":
      return i18n._({ id: "block-editor.table.align-center", message: "Align center" });
    case "right":
      return i18n._({ id: "block-editor.table.align-right", message: "Align right" });
  }
}

export function TableHandleMenu({
  activeMenu,
  kind,
  onAction,
  onOpenChange,
  target,
}: TableHandleMenuProps) {
  const { i18n } = useLingui();
  const open = activeMenu === kind;

  return (
    <DropdownMenu open={open} onOpenChange={(nextOpen) => onOpenChange(kind, nextOpen)}>
      <DropdownMenuTrigger
        aria-label={getMenuLabel(i18n, kind)}
        className={cn(
          "absolute h-3 w-4.5 -translate-x-1/2 -translate-y-1/2 leading-0 bg-muted",
          kind === "row" && "rotate-90",
        )}
        data-table-control
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
        }}
        render={<Button variant="outline" />}
        style={{
          insetBlockStart: target.handles[kind].blockStart,
          insetInlineStart: target.handles[kind].inlineStart,
        }}
      >
        <span aria-hidden="true">⋯</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="w-auto"
        contentEditable={false}
        data-table-control
        side={kind === "column" ? "bottom" : "right"}
        sideOffset={6}
      >
        <DropdownMenuGroup>
          {TABLE_ACTIONS[kind].map((action) => {
            const disabled = action.isDisabled(target);
            const ActionIcon = action.icon;

            return (
              <DropdownMenuItem
                key={action.operation}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) onAction(action.operation);
                }}
              >
                <ActionIcon />
                {getActionLabel(i18n, action.operation)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        {kind === "column" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuRadioGroup
                value={target.columnAlign}
                onValueChange={(value) => {
                  if (isTableColumnAlign(value)) {
                    onAction({ align: value, operation: "set-column-align" });
                  }
                }}
              >
                {TABLE_ALIGNMENTS.map(({ align, icon: AlignIcon }) => (
                  <DropdownMenuRadioItem key={align} value={align}>
                    <AlignIcon />
                    {getAlignmentLabel(i18n, align)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
