import type { BlockVisibility } from "@renderer/clients";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type { WorkspaceBlockCollection } from "../block-collection/workspace-block-collection";
import type { BlockEditorRegistry } from "../editor-registry/use-block-editor-registry";

export type BlockNavigationAlign = "start" | "auto";

export class BlockNavigationCancelledError extends Error {
  constructor() {
    super("Block navigation was superseded by a newer request.");
    this.name = "BlockNavigationCancelledError";
  }
}

export class BlockNavigationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockNavigationError";
  }
}

export function isBlockNavigationCancelledError(
  error: unknown,
): error is BlockNavigationCancelledError {
  return error instanceof BlockNavigationCancelledError;
}

export interface BlockScrollTarget {
  align: BlockNavigationAlign;
  index: number;
  requestId: number;
}

type BlockNavigationView = "current" | "active-unfiltered" | "archived-unfiltered";

interface BlockNavigationRequest {
  align: BlockNavigationAlign;
  blockId: string;
  requestId: number;
  view: BlockNavigationView;
}

interface LocatedTarget {
  blockId: string;
  index: number;
}

type NavigationState =
  | { phase: "idle" }
  | { phase: "preparing-view"; request: BlockNavigationRequest }
  | { phase: "resolving-target"; request: BlockNavigationRequest }
  | { phase: "ensuring-page"; request: BlockNavigationRequest; target: LocatedTarget }
  | { phase: "scrolling"; request: BlockNavigationRequest; target: LocatedTarget }
  | { phase: "focusing"; request: BlockNavigationRequest; target: LocatedTarget };

type NavigationEvent =
  | { type: "start"; request: BlockNavigationRequest }
  | { type: "view-ready"; requestId: number }
  | { type: "target-resolved"; requestId: number; target: LocatedTarget }
  | { type: "page-loaded"; requestId: number; target: LocatedTarget }
  | { type: "target-rendered"; blockId: string }
  | { type: "finish"; requestId: number }
  | { type: "fail"; requestId: number };

interface NavigationDeferred {
  reject: (reason: unknown) => void;
  resolve: () => void;
}

interface StartNavigationRequestParams {
  align?: BlockNavigationAlign;
  blockId: string;
  view?: BlockNavigationView;
}

interface NavigateToBlockOptions {
  align?: BlockNavigationAlign;
}

function isCurrentRequest(state: NavigationState, requestId: number): boolean {
  return state.phase !== "idle" && state.request.requestId === requestId;
}

function needsPreparedView(request: BlockNavigationRequest): boolean {
  return request.view !== "current";
}

export function blockNavigationReducer(
  state: NavigationState,
  event: NavigationEvent,
): NavigationState {
  switch (event.type) {
    case "start":
      return needsPreparedView(event.request)
        ? { phase: "preparing-view", request: event.request }
        : { phase: "resolving-target", request: event.request };
    case "view-ready":
      if (state.phase !== "preparing-view" || state.request.requestId !== event.requestId) {
        return state;
      }
      return { phase: "resolving-target", request: state.request };
    case "target-resolved":
      if (!isCurrentRequest(state, event.requestId) || state.phase !== "resolving-target") {
        return state;
      }
      return { phase: "ensuring-page", request: state.request, target: event.target };
    case "page-loaded":
      if (!isCurrentRequest(state, event.requestId) || state.phase !== "ensuring-page") {
        return state;
      }
      return { phase: "scrolling", request: state.request, target: event.target };
    case "target-rendered":
      if (state.phase !== "scrolling") {
        return state;
      }
      if (state.target.blockId !== event.blockId) {
        return state;
      }
      return { phase: "focusing", request: state.request, target: state.target };
    case "finish":
    case "fail":
      return isCurrentRequest(state, event.requestId) ? { phase: "idle" } : state;
  }
}

interface UseBlockNavigationParams {
  blockCollection: Pick<
    WorkspaceBlockCollection,
    "ensureBlockIndexLoaded" | "getBlockAtIndex" | "locateBlockInView"
  >;
  registry: BlockEditorRegistry;
  workspaceView: {
    isUnfiltered: (visibility: BlockVisibility) => boolean;
    showUnfiltered: (visibility: BlockVisibility) => void;
    visibility: BlockVisibility;
  };
}

interface UseBlockNavigationResult {
  activeBlockId: string | null;
  navigateToBlock: (blockId: string, options?: NavigateToBlockOptions) => Promise<void>;
  scrollTarget: BlockScrollTarget | null;
  setActiveBlockId: (blockId: string | null) => void;
  targetRendered: (blockId: string) => void;
}

function createBlockNavigationError(message: string): BlockNavigationError {
  return new BlockNavigationError(message);
}

export function useBlockNavigation({
  blockCollection,
  registry,
  workspaceView,
}: UseBlockNavigationParams): UseBlockNavigationResult {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [state, dispatch] = useReducer(blockNavigationReducer, { phase: "idle" });
  const deferredByRequestIdRef = useRef(new Map<number, NavigationDeferred>());
  const nextRequestIdRef = useRef(0);

  const isActiveUnfiltered = workspaceView.isUnfiltered("active");
  const isArchivedUnfiltered = workspaceView.isUnfiltered("archived");

  const startRequest = useCallback(
    ({ align = "start", blockId, view = "current" }: StartNavigationRequestParams) => {
      const request: BlockNavigationRequest = {
        align,
        blockId,
        requestId: (nextRequestIdRef.current += 1),
        view,
      };

      for (const [, deferred] of deferredByRequestIdRef.current) {
        deferred.reject(new BlockNavigationCancelledError());
      }
      deferredByRequestIdRef.current.clear();

      const promise = new Promise<void>((resolve, reject) => {
        deferredByRequestIdRef.current.set(request.requestId, { reject, resolve });
      });
      dispatch({ type: "start", request });
      return promise;
    },
    [],
  );

  const navigateToBlock = useCallback(
    (blockId: string, options?: NavigateToBlockOptions) =>
      startRequest({ align: options?.align, blockId }),
    [startRequest],
  );

  const failRequest = useEffectEvent((request: BlockNavigationRequest, error: unknown) => {
    deferredByRequestIdRef.current.get(request.requestId)?.reject(error);
    deferredByRequestIdRef.current.delete(request.requestId);
    dispatch({ type: "fail", requestId: request.requestId });
  });

  const finishRequest = useEffectEvent((request: BlockNavigationRequest) => {
    deferredByRequestIdRef.current.get(request.requestId)?.resolve();
    deferredByRequestIdRef.current.delete(request.requestId);
    dispatch({ type: "finish", requestId: request.requestId });
  });

  useEffect(() => {
    return () => {
      for (const [, deferred] of deferredByRequestIdRef.current) {
        deferred.reject(new BlockNavigationCancelledError());
      }
      deferredByRequestIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (state.phase !== "preparing-view") {
      return;
    }

    const nextVisibility: BlockVisibility =
      state.request.view === "archived-unfiltered" ? "archived" : "active";
    const isTargetViewReady =
      state.request.view === "archived-unfiltered" ? isArchivedUnfiltered : isActiveUnfiltered;

    workspaceView.showUnfiltered(nextVisibility);
    if (isTargetViewReady) {
      dispatch({ type: "view-ready", requestId: state.request.requestId });
    }
  }, [isActiveUnfiltered, isArchivedUnfiltered, state, workspaceView]);

  useEffect(() => {
    if (state.phase !== "resolving-target") {
      return;
    }

    let cancelled = false;
    const { request } = state;

    function getFallbackView(): BlockNavigationView | null {
      if (request.view === "current") {
        return isActiveUnfiltered ? "archived-unfiltered" : "active-unfiltered";
      }
      if (request.view === "active-unfiltered") {
        return "archived-unfiltered";
      }
      return null;
    }

    async function resolveTarget(): Promise<void> {
      const result = await blockCollection.locateBlockInView(request.blockId);
      if (cancelled) return;
      if (!result || result.block.id !== request.blockId) {
        const fallbackView = getFallbackView();
        if (fallbackView) {
          dispatch({ type: "start", request: { ...request, view: fallbackView } });
          return;
        }
        failRequest(request, createBlockNavigationError("Block not found"));
        return;
      }
      dispatch({
        type: "target-resolved",
        requestId: request.requestId,
        target: { blockId: result.block.id, index: result.index },
      });
    }

    void resolveTarget().catch(() => {
      if (!cancelled) {
        failRequest(request, createBlockNavigationError("Failed to locate block"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [blockCollection, failRequest, isActiveUnfiltered, state]);

  useEffect(() => {
    if (state.phase !== "ensuring-page") {
      return;
    }

    let cancelled = false;
    const { request, target } = state;

    void blockCollection
      .ensureBlockIndexLoaded(target.index, { refresh: true })
      .then((loadedBlock) => {
        if (cancelled) return;

        const block = loadedBlock ?? blockCollection.getBlockAtIndex(target.index);
        if (!block || block.id !== target.blockId) {
          failRequest(request, createBlockNavigationError("Failed to load block"));
          return;
        }
        dispatch({
          type: "page-loaded",
          requestId: request.requestId,
          target: { blockId: block.id, index: target.index },
        });
      })
      .catch(() => {
        if (!cancelled) {
          failRequest(request, createBlockNavigationError("Failed to load block"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [blockCollection, failRequest, state]);

  useEffect(() => {
    if (state.phase !== "focusing") {
      return;
    }

    const { request, target } = state;
    setActiveBlockId(target.blockId);
    registry.requestEditorFocus(target.blockId, request.requestId);
    finishRequest(request);
  }, [finishRequest, registry, state]);

  const scrollTarget = useMemo<BlockScrollTarget | null>(() => {
    if (state.phase !== "scrolling") {
      return null;
    }
    return {
      align: state.request.align,
      index: state.target.index,
      requestId: state.request.requestId,
    };
  }, [state]);

  const targetRendered = useCallback((blockId: string) => {
    dispatch({
      type: "target-rendered",
      blockId,
    });
  }, []);

  return {
    activeBlockId,
    navigateToBlock,
    scrollTarget,
    setActiveBlockId,
    targetRendered,
  };
}
