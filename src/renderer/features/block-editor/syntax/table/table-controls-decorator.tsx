import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getTableNodeFromLexicalNodeOrThrow,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
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
import { $getNearestNodeFromDOMNode, type NodeKey } from "lexical";
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

interface ActiveTableCellState {
  key: NodeKey;
  tableKey: NodeKey;
  rowIndex: number;
  columnIndex: number;
  rowCount: number;
  columnCount: number;
  columnStartRect: DOMRect;
  rowStartRect: DOMRect;
}

interface ActiveTableCellDocumentState extends Omit<
  ActiveTableCellState,
  "columnStartRect" | "rowStartRect"
> {
  columnStartKey: NodeKey;
  rowStartKey: NodeKey;
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
  setActiveCell: (cell: ActiveTableCellState | null) => void;
  setMenuContext: (context: TableActionContext | null) => void;
  style: React.CSSProperties;
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

function areRectsEqual(a: DOMRect, b: DOMRect): boolean {
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

function areActiveCellsEqual(
  previous: ActiveTableCellState | null,
  next: ActiveTableCellState | null,
): boolean {
  if (!previous || !next) return previous === next;

  return (
    previous.key === next.key &&
    previous.tableKey === next.tableKey &&
    previous.rowIndex === next.rowIndex &&
    previous.columnIndex === next.columnIndex &&
    previous.rowCount === next.rowCount &&
    previous.columnCount === next.columnCount &&
    areRectsEqual(previous.columnStartRect, next.columnStartRect) &&
    areRectsEqual(previous.rowStartRect, next.rowStartRect)
  );
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

function createActionContext(
  cell: ActiveTableCellState,
  kind: "row" | "column",
): TableActionContext {
  return {
    cellKey: cell.key,
    count: kind === "column" ? cell.columnCount : cell.rowCount,
    index: kind === "column" ? cell.columnIndex : cell.rowIndex,
    kind,
    tableKey: cell.tableKey,
  };
}

function TableHandleMenu({
  actions,
  context,
  editorFocus,
  handleAction,
  menuContext,
  setActiveCell,
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
          return;
        }

        if (open) {
          setMenuContext(null);
          window.requestAnimationFrame(() => {
            if (!isPointerOverTableControls()) setActiveCell(null);
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
  const [activeCell, setActiveCell] = useState<ActiveTableCellState | null>(null);
  const [menuContext, setMenuContext] = useState<TableActionContext | null>(null);
  const activeCellKeyRef = useRef<NodeKey | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const shellElement = getEditorShellElement(editor.getRootElement());

  const readCellState = useCallback(
    (cellKey: NodeKey): ActiveTableCellState | null => {
      const shell = getEditorShellElement(editor.getRootElement());
      if (!shell) return null;

      const element = editor.getElementByKey(cellKey);
      if (!element) return null;

      const documentState = editor.getEditorState().read(
        (): ActiveTableCellDocumentState | null => {
          const node = $getNearestNodeFromDOMNode(element);
          const cellNode = $isTableCellNode(node) ? node : null;
          const tableNode = cellNode ? $getTableNodeFromLexicalNodeOrThrow(cellNode) : null;
          if (!cellNode || !$isTableNode(tableNode)) return null;

          const rows = tableNode.getChildren().filter($isTableRowNode);
          const rowIndex = getTableCellRowIndex(cellNode);
          const columnIndex = getTableCellColumnIndex(cellNode);
          const rowStartNode = rows.at(rowIndex)?.getChildren().filter($isTableCellNode).at(0);
          const columnStartNode = rows
            .at(0)
            ?.getChildren()
            .filter($isTableCellNode)
            .at(columnIndex);
          if (!rowStartNode || !columnStartNode) return null;

          return {
            columnCount: getTableColumnCount(tableNode),
            columnIndex,
            columnStartKey: columnStartNode.getKey(),
            key: cellNode.getKey(),
            rowCount: getTableRowCount(tableNode),
            rowIndex,
            rowStartKey: rowStartNode.getKey(),
            tableKey: tableNode.getKey(),
          };
        },
        { editor },
      );

      if (!documentState) return null;
      const columnStartElement = editor.getElementByKey(documentState.columnStartKey);
      const rowStartElement = editor.getElementByKey(documentState.rowStartKey);
      if (!columnStartElement || !rowStartElement) return null;

      return {
        columnCount: documentState.columnCount,
        columnIndex: documentState.columnIndex,
        columnStartRect: toShellRect(
          shell.getBoundingClientRect(),
          columnStartElement.getBoundingClientRect(),
          shell,
        ),
        key: documentState.key,
        rowCount: documentState.rowCount,
        rowIndex: documentState.rowIndex,
        rowStartRect: toShellRect(
          shell.getBoundingClientRect(),
          rowStartElement.getBoundingClientRect(),
          shell,
        ),
        tableKey: documentState.tableKey,
      };
    },
    [editor],
  );

  const updateActiveCell = useCallback(
    (cellKey: NodeKey | null) => {
      activeCellKeyRef.current = cellKey;
      const nextCell = cellKey ? readCellState(cellKey) : null;
      setActiveCell((previousCell) =>
        areActiveCellsEqual(previousCell, nextCell) ? previousCell : nextCell,
      );
    },
    [readCellState],
  );

  const scheduleMeasureActiveCell = useCallback(() => {
    if (animationFrameIdRef.current !== null) return;

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      animationFrameIdRef.current = null;
      updateActiveCell(activeCellKeyRef.current);
    });
  }, [updateActiveCell]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      scheduleMeasureActiveCell();
    });
  }, [editor, scheduleMeasureActiveCell]);

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", scheduleMeasureActiveCell);
    window.addEventListener("scroll", scheduleMeasureActiveCell, true);

    return () => {
      window.removeEventListener("resize", scheduleMeasureActiveCell);
      window.removeEventListener("scroll", scheduleMeasureActiveCell, true);
    };
  }, [scheduleMeasureActiveCell]);

  useEffect(() => {
    const shell = getEditorShellElement(editor.getRootElement());
    if (!shell) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (findControlFromTarget(event.target)) {
        return;
      }

      const cellElement = findCellFromTarget(event.target);
      if (!cellElement) {
        if (!menuContext) updateActiveCell(null);
        return;
      }

      let cellKey: NodeKey | null = null;
      editor.getEditorState().read(
        () => {
          const node = $getNearestNodeFromDOMNode(cellElement);
          const cellNode = $isTableCellNode(node) ? node : null;
          const tableNode = cellNode ? $getTableNodeFromLexicalNodeOrThrow(cellNode) : null;
          if (!cellNode || !$isTableNode(tableNode)) return;

          cellKey = cellNode.getKey();
        },
        { editor },
      );
      updateActiveCell(cellKey);
    };

    const handlePointerLeave = () => {
      window.requestAnimationFrame(() => {
        if (menuContext || isPointerOverTableControls()) return;
        updateActiveCell(null);
      });
    };

    shell.addEventListener("pointermove", handlePointerMove);
    shell.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      shell.removeEventListener("pointermove", handlePointerMove);
      shell.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [editor, menuContext, updateActiveCell]);

  const handleAction = useCallback(
    (operation: TableStructureOperation) => {
      if (!menuContext) return;
      performTableStructureOperation(editor, { cellKey: menuContext.cellKey, operation });
      setMenuContext(null);
      updateActiveCell(null);
      scheduleMeasureActiveCell();
      editor.focus();
    },
    [editor, menuContext, scheduleMeasureActiveCell, updateActiveCell],
  );

  if (!shellElement || !activeCell) return null;

  const columnContext = createActionContext(activeCell, "column");
  const rowContext = createActionContext(activeCell, "row");

  return createPortal(
    <>
      <TableHandleMenu
        actions={getColumnActions(columnContext)}
        context={columnContext}
        editorFocus={() => editor.focus()}
        handleAction={handleAction}
        menuContext={menuContext}
        setActiveCell={setActiveCell}
        setMenuContext={setMenuContext}
        style={{
          insetBlockStart: activeCell.columnStartRect.top,
          insetInlineStart: activeCell.columnStartRect.left + activeCell.columnStartRect.width / 2,
        }}
      />
      <TableHandleMenu
        actions={getRowActions(rowContext)}
        context={rowContext}
        editorFocus={() => editor.focus()}
        handleAction={handleAction}
        menuContext={menuContext}
        setActiveCell={setActiveCell}
        setMenuContext={setMenuContext}
        style={{
          insetBlockStart: activeCell.rowStartRect.top + activeCell.rowStartRect.height / 2,
          insetInlineStart: activeCell.rowStartRect.left,
        }}
      />
    </>,
    shellElement,
  );
}
