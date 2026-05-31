import type { Ctx } from "@milkdown/kit/ctx";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import { type CreateReactPluginView, usePluginViewContext } from "@prosemirror-adapter/react";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TableHandleMenu } from "./table-controls-menu";
import {
  areTableTargetsEqual,
  findTableControlElement,
  readTableTargetFromDom,
  readTableTargetFromSelection,
  type TableControlKind,
  type TableControlTarget,
} from "./table-controls-state";
import { performTableOperation, type TableOperationAction } from "./table-operations";

const tableControlsPluginKey = new PluginKey("FLUXNOTES_TABLE_CONTROLS");

export interface TableControlPluginInput {
  pluginViewFactory: CreateReactPluginView;
}

interface TableControlPluginViewProps {
  ctx: Ctx;
}

function getOverlayContainer(viewDom: HTMLElement): HTMLElement {
  return viewDom.closest<HTMLElement>(".block-editor") ?? viewDom;
}

function TableControlPluginView({ ctx }: TableControlPluginViewProps) {
  const { prevState, view } = usePluginViewContext();
  const [target, setTarget] = useState<TableControlTarget | null>(null);
  const [activeMenu, setActiveMenu] = useState<TableControlKind | null>(null);
  const pointerOverControlsRef = useRef(false);
  const activeMenuRef = useRef<TableControlKind | null>(null);
  const activeTargetRef = useRef<TableControlTarget | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const overlayContainer = getOverlayContainer(view.dom);

  const publishTarget = useCallback((nextTarget: TableControlTarget | null) => {
    activeTargetRef.current = nextTarget;
    setTarget((currentTarget) =>
      areTableTargetsEqual(currentTarget, nextTarget) ? currentTarget : nextTarget,
    );
  }, []);

  const clearTarget = useCallback(() => {
    publishTarget(null);
  }, [publishTarget]);

  const scheduleMeasure = useCallback(() => {
    if (animationFrameIdRef.current !== null) return;

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      animationFrameIdRef.current = null;
      if (activeTargetRef.current) publishTarget(readTableTargetFromSelection(view));
    });
  }, [publishTarget, view]);

  const clearTargetIfIdle = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (activeMenuRef.current || pointerOverControlsRef.current) return;
      clearTarget();
    });
  }, [clearTarget]);

  const setOpenMenu = useCallback((nextMenu: TableControlKind | null) => {
    activeMenuRef.current = nextMenu;
    setActiveMenu(nextMenu);
  }, []);

  const handleMenuOpenChange = useCallback(
    (kind: TableControlKind, open: boolean) => {
      if (open) {
        setOpenMenu(kind);
        return;
      }

      if (activeMenuRef.current === kind) {
        setOpenMenu(null);
        view.focus();
        clearTargetIfIdle();
      }
    },
    [clearTargetIfIdle, setOpenMenu, view],
  );

  const handleAction = useCallback(
    (action: TableOperationAction) => {
      const currentTarget = activeTargetRef.current;
      if (!currentTarget) return;

      performTableOperation(ctx, view, currentTarget, action);
      setOpenMenu(null);
      publishTarget(readTableTargetFromSelection(view));
      view.focus();
    },
    [ctx, publishTarget, setOpenMenu, view],
  );

  useEffect(() => {
    const nextTarget = readTableTargetFromSelection(view);
    if (view.hasFocus()) publishTarget(nextTarget);
  }, [prevState, publishTarget, view]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (findTableControlElement(event.target)) return;

      const nextTarget = readTableTargetFromDom(view, event.target);
      if (!nextTarget) {
        if (!activeMenuRef.current) clearTarget();
        return;
      }

      publishTarget(nextTarget);
    };

    const handlePointerLeave = () => {
      clearTargetIfIdle();
    };

    const handleFocus = () => {
      publishTarget(readTableTargetFromSelection(view));
    };

    const handleBlur = () => {
      if (!activeMenuRef.current && !pointerOverControlsRef.current) clearTarget();
    };

    view.dom.addEventListener("pointermove", handlePointerMove);
    view.dom.addEventListener("pointerleave", handlePointerLeave);
    view.dom.addEventListener("focus", handleFocus, true);
    view.dom.addEventListener("blur", handleBlur, true);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);

    return () => {
      view.dom.removeEventListener("pointermove", handlePointerMove);
      view.dom.removeEventListener("pointerleave", handlePointerLeave);
      view.dom.removeEventListener("focus", handleFocus, true);
      view.dom.removeEventListener("blur", handleBlur, true);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [clearTarget, clearTargetIfIdle, publishTarget, scheduleMeasure, view]);

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  if (!target) return null;

  return createPortal(
    createElement(
      "div",
      {
        "data-table-control": true,
        onPointerEnter: () => {
          pointerOverControlsRef.current = true;
        },
        onPointerLeave: () => {
          pointerOverControlsRef.current = false;
          clearTargetIfIdle();
        },
      },
      createElement(TableHandleMenu, {
        activeMenu,
        kind: "column",
        onAction: handleAction,
        onOpenChange: handleMenuOpenChange,
        target,
      }),
      createElement(TableHandleMenu, {
        activeMenu,
        kind: "row",
        onAction: handleAction,
        onOpenChange: handleMenuOpenChange,
        target,
      }),
    ),
    overlayContainer,
  );
}

export function createTableControlPlugin({ pluginViewFactory }: TableControlPluginInput) {
  return $prose(
    (ctx) =>
      new Plugin({
        key: tableControlsPluginKey,
        view: pluginViewFactory({
          component: function TableControlPluginViewComponent() {
            return createElement(TableControlPluginView, { ctx });
          },
        }),
      }),
  );
}
