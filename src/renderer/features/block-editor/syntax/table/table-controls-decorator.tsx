import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback } from "react";
import { createPortal } from "react-dom";

import { TableHandleMenu } from "./table-controls-menu";
import { type TableControlKind, useTableControlState } from "./table-controls-state";
import { performTableStructureOperation, type TableStructureOperation } from "./table-operations";

export function TableControlsDecorator() {
  const [editor] = useLexicalComposerContext();
  const {
    activeMenu,
    clearTarget,
    clearTargetIfIdle,
    scheduleMeasure,
    setActiveMenu,
    setPointerOverControls,
    shellElement,
    target,
  } = useTableControlState(editor);

  const closeMenu = useCallback(() => {
    setActiveMenu(null);
    editor.focus();
  }, [editor, setActiveMenu]);

  const handleMenuOpenChange = useCallback(
    (kind: TableControlKind, open: boolean) => {
      if (open) {
        setActiveMenu(kind);
        return;
      }

      if (activeMenu === kind) {
        closeMenu();
        clearTargetIfIdle();
      }
    },
    [activeMenu, clearTargetIfIdle, closeMenu, setActiveMenu],
  );

  const handleAction = useCallback(
    (operation: TableStructureOperation) => {
      if (!target) return;

      performTableStructureOperation(editor, { cellKey: target.cellKey, operation });
      setActiveMenu(null);
      clearTarget();
      scheduleMeasure();
      editor.focus();
    },
    [clearTarget, editor, scheduleMeasure, setActiveMenu, target],
  );

  if (!shellElement || !target) return null;

  return createPortal(
    <div
      data-table-control
      onPointerEnter={() => setPointerOverControls(true)}
      onPointerLeave={() => setPointerOverControls(false)}
    >
      <TableHandleMenu
        activeMenu={activeMenu}
        kind="column"
        onAction={handleAction}
        onOpenChange={handleMenuOpenChange}
        target={target}
      />
      <TableHandleMenu
        activeMenu={activeMenu}
        kind="row"
        onAction={handleAction}
        onOpenChange={handleMenuOpenChange}
        target={target}
      />
    </div>,
    shellElement,
  );
}
