import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getTableNodeFromLexicalNodeOrThrow,
  $isTableCellNode,
  $isTableNode,
} from "@lexical/table";
import { Button } from "@renderer/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@renderer/ui/components/dropdown-menu";
import clsx from "clsx";
import {
  $getNearestNodeFromDOMNode,
  $getRoot,
  $isElementNode,
  type LexicalNode,
  type NodeKey,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  getTableCellColumnIndex,
  getTableCellRowIndex,
  getTableColumnCount,
  getTableRowCount,
  performTableStructureOperation,
  type TableStructureOperation,
} from "./table-operations";

interface TableCellDocumentState {
  key: NodeKey;
  tableKey: NodeKey;
  rowIndex: number;
  columnIndex: number;
  rowCount: number;
  columnCount: number;
}

interface TableCellViewState extends TableCellDocumentState {
  rect: DOMRect;
}

interface TableActionContext {
  cellKey: NodeKey;
  tableKey: NodeKey;
  index: number;
  count: number;
  kind: "row" | "column";
}

interface TableMenuAction {
  label: string;
  operation: TableStructureOperation;
  disabled: boolean;
}

interface TableHandleMenuProps {
  actions: TableMenuAction[];
  context: TableActionContext;
  editorFocus: () => void;
  handleAction: (operation: TableStructureOperation) => void;
  menuContext: TableActionContext | null;
  setActiveCellKey: (key: NodeKey | null) => void;
  setMenuContext: (context: TableActionContext | null) => void;
  style: React.CSSProperties;
}

function createActionContext(cell: TableCellViewState, kind: "row" | "column"): TableActionContext {
  return {
    cellKey: cell.key,
    count: kind === "column" ? cell.columnCount : cell.rowCount,
    index: kind === "column" ? cell.columnIndex : cell.rowIndex,
    kind,
    tableKey: cell.tableKey,
  };
}

function collectTableCells(node: LexicalNode, cells: TableCellDocumentState[]): void {
  if ($isTableCellNode(node)) {
    const tableNode = $getTableNodeFromLexicalNodeOrThrow(node);
    cells.push({
      key: node.getKey(),
      tableKey: tableNode.getKey(),
      rowIndex: getTableCellRowIndex(node),
      columnIndex: getTableCellColumnIndex(node),
      rowCount: getTableRowCount(tableNode),
      columnCount: getTableColumnCount(tableNode),
    });
    return;
  }

  if (!$isElementNode(node)) {
    return;
  }

  for (const child of node.getChildren()) {
    collectTableCells(child, cells);
  }
}

function readTableCells(): TableCellDocumentState[] {
  const cells: TableCellDocumentState[] = [];
  collectTableCells($getRoot(), cells);
  return cells;
}

function getEditorShellElement(editorRootElement: HTMLElement | null): HTMLElement | null {
  return editorRootElement?.closest<HTMLElement>(".block-editor__shell") ?? null;
}

function toShellRect(shellRect: DOMRect, cellRect: DOMRect, shell: HTMLElement): DOMRect {
  return DOMRect.fromRect({
    height: cellRect.height,
    width: cellRect.width,
    x: cellRect.left - shellRect.left + shell.scrollLeft,
    y: cellRect.top - shellRect.top + shell.scrollTop,
  });
}

function areCellViewsEqual(
  previousCells: ReadonlyArray<TableCellViewState>,
  nextCells: ReadonlyArray<TableCellViewState>,
): boolean {
  if (previousCells.length !== nextCells.length) return false;

  return previousCells.every((previousCell, index) => {
    const nextCell = nextCells[index];
    return (
      previousCell.key === nextCell.key &&
      previousCell.tableKey === nextCell.tableKey &&
      previousCell.rowIndex === nextCell.rowIndex &&
      previousCell.columnIndex === nextCell.columnIndex &&
      previousCell.rowCount === nextCell.rowCount &&
      previousCell.columnCount === nextCell.columnCount &&
      previousCell.rect.left === nextCell.rect.left &&
      previousCell.rect.top === nextCell.rect.top &&
      previousCell.rect.width === nextCell.rect.width &&
      previousCell.rect.height === nextCell.rect.height
    );
  });
}

function findCellFromTarget(target: EventTarget | null): HTMLTableCellElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLTableCellElement>(".block-editor__table-cell");
}

function findControlFromTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest("[data-table-control]");
}

function isPointerOverTableControls(): boolean {
  return Array.from(document.querySelectorAll(":hover")).some(
    (element) => element instanceof Element && element.matches("[data-table-control]"),
  );
}

function isSameContext(a: TableActionContext | null, b: TableActionContext): boolean {
  return a?.kind === b.kind && a.tableKey === b.tableKey && a.index === b.index;
}

function TableHandleMenu({
  actions,
  context,
  editorFocus,
  handleAction,
  menuContext,
  setActiveCellKey,
  setMenuContext,
  style,
}: TableHandleMenuProps) {
  const open = isSameContext(menuContext, context);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setMenuContext(context);
          setActiveCellKey(context.cellKey);
          return;
        }

        if (open) {
          setMenuContext(null);
          window.requestAnimationFrame(() => {
            if (!isPointerOverTableControls()) setActiveCellKey(null);
          });
          editorFocus();
        }
      }}
    >
      <DropdownMenuTrigger
        aria-label={context.kind === "column" ? "打开列操作菜单" : "打开行操作菜单"}
        className={clsx(
          "h-3 w-4.5 -translate-x-1/2 -translate-y-1/2 absolute leading-0",
          context.kind === "row" ? "rotate-90" : undefined,
        )}
        data-table-control
        onPointerEnter={() => {
          setActiveCellKey(context.cellKey);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        render={<Button variant="outline" />}
        style={style}
      >
        <span aria-hidden="true">⋯</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="w-auto"
        contentEditable={false}
        data-table-control
        side={context.kind === "column" ? "bottom" : "right"}
        sideOffset={6}
      >
        <DropdownMenuGroup>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.operation}
              disabled={action.disabled}
              onClick={() => {
                if (!action.disabled) handleAction(action.operation);
              }}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getColumnActions(context: TableActionContext): TableMenuAction[] {
  return [
    { disabled: false, label: "左侧插入列", operation: "insert-column-left" },
    { disabled: false, label: "右侧插入列", operation: "insert-column-right" },
    { disabled: context.index <= 0, label: "左移", operation: "move-column-left" },
    { disabled: context.index >= context.count - 1, label: "右移", operation: "move-column-right" },
    { disabled: context.count <= 1, label: "删除列", operation: "delete-column" },
  ];
}

function getRowActions(context: TableActionContext): TableMenuAction[] {
  return [
    { disabled: false, label: "上方插入行", operation: "insert-row-above" },
    { disabled: false, label: "下方插入行", operation: "insert-row-below" },
    { disabled: context.index <= 0, label: "上移", operation: "move-row-up" },
    { disabled: context.index >= context.count - 1, label: "下移", operation: "move-row-down" },
    { disabled: context.count <= 1, label: "删除行", operation: "delete-row" },
  ];
}

export function TableControlsDecorator() {
  const [editor] = useLexicalComposerContext();
  const [cells, setCells] = useState<TableCellViewState[]>([]);
  const [activeCellKey, setActiveCellKey] = useState<NodeKey | null>(null);
  const [menuContext, setMenuContext] = useState<TableActionContext | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const shellElement = getEditorShellElement(editor.getRootElement());

  const measureCells = useCallback(() => {
    const shell = getEditorShellElement(editor.getRootElement());
    if (!shell) {
      setCells([]);
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    editor.getEditorState().read(
      () => {
        const nextCells = readTableCells().flatMap((cell): TableCellViewState[] => {
          const element = editor.getElementByKey(cell.key);
          if (!element) return [];
          return [
            { ...cell, rect: toShellRect(shellRect, element.getBoundingClientRect(), shell) },
          ];
        });

        setCells((previousCells) =>
          areCellViewsEqual(previousCells, nextCells) ? previousCells : nextCells,
        );
      },
      { editor },
    );
  }, [editor]);

  const scheduleMeasureCells = useCallback(() => {
    if (animationFrameIdRef.current !== null) return;

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      animationFrameIdRef.current = null;
      measureCells();
    });
  }, [measureCells]);

  useEffect(() => {
    scheduleMeasureCells();
    return editor.registerUpdateListener(() => {
      scheduleMeasureCells();
    });
  }, [editor, scheduleMeasureCells]);

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", scheduleMeasureCells);
    window.addEventListener("scroll", scheduleMeasureCells, true);

    return () => {
      window.removeEventListener("resize", scheduleMeasureCells);
      window.removeEventListener("scroll", scheduleMeasureCells, true);
    };
  }, [scheduleMeasureCells]);

  useEffect(() => {
    const shell = getEditorShellElement(editor.getRootElement());
    if (!shell) return;

    const handlePointerMove = (event: PointerEvent) => {
      const target = event.target;
      if (findControlFromTarget(target)) {
        return;
      }

      const cellElement = findCellFromTarget(target);
      if (!cellElement) {
        if (!menuContext) setActiveCellKey(null);
        return;
      }

      editor.getEditorState().read(
        () => {
          const node = $getNearestNodeFromDOMNode(cellElement);
          const cellNode = $isTableCellNode(node) ? node : null;
          const tableNode = cellNode ? $getTableNodeFromLexicalNodeOrThrow(cellNode) : null;
          if (!cellNode || !$isTableNode(tableNode)) return;

          setActiveCellKey(cellNode.getKey());
        },
        { editor },
      );
    };

    const handlePointerLeave = () => {
      window.requestAnimationFrame(() => {
        if (menuContext || isPointerOverTableControls()) return;
        setActiveCellKey(null);
      });
    };

    shell.addEventListener("pointermove", handlePointerMove);
    shell.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      shell.removeEventListener("pointermove", handlePointerMove);
      shell.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [editor, menuContext]);

  const handleAction = useCallback(
    (operation: TableStructureOperation) => {
      if (!menuContext) return;
      performTableStructureOperation(editor, { cellKey: menuContext.cellKey, operation });
      setMenuContext(null);
      setActiveCellKey(null);
      scheduleMeasureCells();
      editor.focus();
    },
    [editor, menuContext, scheduleMeasureCells],
  );

  if (!shellElement || cells.length === 0) return null;

  const activeCellByKey = activeCellKey ? cells.find((cell) => cell.key === activeCellKey) : null;
  const activeCell = menuContext
    ? cells.find(
        (cell) =>
          cell.key === menuContext.cellKey ||
          (cell.tableKey === menuContext.tableKey &&
            (menuContext.kind === "column"
              ? cell.columnIndex === menuContext.index
              : cell.rowIndex === menuContext.index)),
      )
    : activeCellByKey;
  const columnContext = activeCell ? createActionContext(activeCell, "column") : null;
  const rowContext = activeCell ? createActionContext(activeCell, "row") : null;

  const columnCell = columnContext
    ? cells.find(
        (cell) =>
          cell.tableKey === columnContext.tableKey && cell.columnIndex === columnContext.index,
      )
    : null;
  const rowCell = rowContext
    ? cells.find(
        (cell) => cell.tableKey === rowContext.tableKey && cell.rowIndex === rowContext.index,
      )
    : null;

  return createPortal(
    <>
      {columnCell && columnContext ? (
        <TableHandleMenu
          actions={getColumnActions(columnContext)}
          context={columnContext}
          editorFocus={() => editor.focus()}
          handleAction={handleAction}
          menuContext={menuContext}
          setActiveCellKey={setActiveCellKey}
          setMenuContext={setMenuContext}
          style={{
            insetBlockStart: columnCell.rect.top,
            insetInlineStart: columnCell.rect.left + columnCell.rect.width / 2,
          }}
        />
      ) : null}
      {rowCell && rowContext ? (
        <TableHandleMenu
          actions={getRowActions(rowContext)}
          context={rowContext}
          editorFocus={() => editor.focus()}
          handleAction={handleAction}
          menuContext={menuContext}
          setActiveCellKey={setActiveCellKey}
          setMenuContext={setMenuContext}
          style={{
            insetBlockStart: rowCell.rect.top + rowCell.rect.height / 2,
            insetInlineStart: rowCell.rect.left,
          }}
        />
      ) : null}
    </>,
    shellElement,
  );
}
