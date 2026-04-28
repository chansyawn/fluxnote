import type { Block, BlockVisibility, LocateBlockResult } from "@renderer/clients";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import type { EditorRegistry } from "./use-editor-registry";

export type BlockNavigationAlign = "start" | "center" | "end" | "auto";
export type BlockNavigationFocus = "editor" | "block" | "none";
export type BlockNavigationViewMode = "current" | "active-unfiltered";

export interface BlockScrollTarget {
  align: BlockNavigationAlign;
  index: number;
  requestId: number;
}

export interface BlockScrollTargetRenderedPayload {
  blockId: string;
  index: number;
  requestId: number;
}

interface NavigationCallbacks {
  acknowledge?: () => void;
  onNotFound?: () => void;
}

interface NavigationOptions extends NavigationCallbacks {
  align?: BlockNavigationAlign;
  focus?: BlockNavigationFocus;
  viewMode?: BlockNavigationViewMode;
}

interface BlockIdNavigationRequest {
  align: BlockNavigationAlign;
  blockId: string;
  focus: BlockNavigationFocus;
  kind: "block-id";
  requestId: number;
  viewMode: BlockNavigationViewMode;
}

interface IndexNavigationRequest {
  align: BlockNavigationAlign;
  focus: BlockNavigationFocus;
  index: number;
  kind: "index";
  requestId: number;
  viewMode: BlockNavigationViewMode;
}

interface LocatedBlockNavigationRequest {
  align: BlockNavigationAlign;
  blockId: string;
  focus: BlockNavigationFocus;
  index: number;
  kind: "located-block";
  requestId: number;
  viewMode: BlockNavigationViewMode;
}

type NavigationRequest =
  | BlockIdNavigationRequest
  | IndexNavigationRequest
  | LocatedBlockNavigationRequest;

interface LocatedTarget {
  blockId: string;
  index: number;
}

type NavigationState =
  | { phase: "idle" }
  | { phase: "preparing-view"; request: NavigationRequest }
  | { phase: "resolving-target"; request: NavigationRequest }
  | { phase: "ensuring-page"; request: NavigationRequest; target: LocatedTarget }
  | { phase: "scrolling"; request: NavigationRequest; target: LocatedTarget }
  | { phase: "focusing"; request: NavigationRequest; target: LocatedTarget };

type NavigationEvent =
  | { type: "start"; request: NavigationRequest }
  | { type: "view-ready"; requestId: number }
  | { type: "target-resolved"; requestId: number; target: LocatedTarget }
  | { type: "page-loaded"; requestId: number; target: LocatedTarget }
  | { type: "target-rendered"; requestId: number; target: LocatedTarget }
  | { type: "finish"; requestId: number }
  | { type: "fail"; requestId: number };

function isCurrentRequest(state: NavigationState, requestId: number): boolean {
  return state.phase !== "idle" && state.request.requestId === requestId;
}

function needsPreparedView(request: NavigationRequest): boolean {
  return request.viewMode === "active-unfiltered";
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
      if (!isCurrentRequest(state, event.requestId) || state.phase !== "scrolling") {
        return state;
      }
      return { phase: "focusing", request: state.request, target: event.target };
    case "finish":
    case "fail":
      return isCurrentRequest(state, event.requestId) ? { phase: "idle" } : state;
  }
}

interface UseBlockNavigationParams {
  ensureBlockIndexLoaded: (index: number) => Promise<Block | undefined>;
  getBlockAtIndex: (index: number) => Block | undefined;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  registry: EditorRegistry;
  selectedTagIds: string[];
  setSelectedTagIds: (tagIds: string[]) => void;
  setVisibility: (visibility: BlockVisibility) => void;
  visibility: BlockVisibility;
}

interface UseBlockNavigationResult {
  activeBlockId: string | null;
  navigateToBlock: (blockId: string, options?: NavigationOptions) => void;
  navigateToIndex: (index: number, options?: NavigationOptions) => void;
  navigateToLocatedBlock: (blockId: string, index: number, options?: NavigationOptions) => void;
  scrollTarget: BlockScrollTarget | null;
  setActiveBlockId: (blockId: string | null) => void;
  targetRendered: (payload: BlockScrollTargetRenderedPayload) => void;
}

function normalizeOptions(options: NavigationOptions | undefined) {
  return {
    align: options?.align ?? "center",
    focus: options?.focus ?? "editor",
    viewMode: options?.viewMode ?? "current",
  } satisfies Pick<NavigationRequest, "align" | "focus" | "viewMode">;
}

export function useBlockNavigation({
  ensureBlockIndexLoaded,
  getBlockAtIndex,
  locateBlockInView,
  registry,
  selectedTagIds,
  setSelectedTagIds,
  setVisibility,
  visibility,
}: UseBlockNavigationParams): UseBlockNavigationResult {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [state, dispatch] = useReducer(blockNavigationReducer, { phase: "idle" });
  const callbacksRef = useRef(new Map<number, NavigationCallbacks>());
  const nextRequestIdRef = useRef(0);

  const isActiveUnfiltered = visibility === "active" && selectedTagIds.length === 0;

  const startRequest = useCallback((request: NavigationRequest, callbacks: NavigationCallbacks) => {
    callbacksRef.current.clear();
    callbacksRef.current.set(request.requestId, callbacks);
    dispatch({ type: "start", request });
  }, []);

  const buildRequestBase = useCallback(
    (options: NavigationOptions | undefined) => ({
      requestId: (nextRequestIdRef.current += 1),
      ...normalizeOptions(options),
    }),
    [],
  );

  const navigateToBlock = useCallback(
    (blockId: string, options?: NavigationOptions) => {
      const request = {
        ...buildRequestBase(options),
        blockId,
        kind: "block-id",
      } satisfies BlockIdNavigationRequest;
      startRequest(request, {
        acknowledge: options?.acknowledge,
        onNotFound: options?.onNotFound,
      });
    },
    [buildRequestBase, startRequest],
  );

  const navigateToIndex = useCallback(
    (index: number, options?: NavigationOptions) => {
      const request = {
        ...buildRequestBase(options),
        index,
        kind: "index",
      } satisfies IndexNavigationRequest;
      startRequest(request, {
        acknowledge: options?.acknowledge,
        onNotFound: options?.onNotFound,
      });
    },
    [buildRequestBase, startRequest],
  );

  const navigateToLocatedBlock = useCallback(
    (blockId: string, index: number, options?: NavigationOptions) => {
      const request = {
        ...buildRequestBase(options),
        blockId,
        index,
        kind: "located-block",
      } satisfies LocatedBlockNavigationRequest;
      startRequest(request, {
        acknowledge: options?.acknowledge,
        onNotFound: options?.onNotFound,
      });
    },
    [buildRequestBase, startRequest],
  );

  const failRequest = useEffectEvent((request: NavigationRequest, message?: string) => {
    const callbacks = callbacksRef.current.get(request.requestId);
    callbacks?.onNotFound?.();
    callbacks?.acknowledge?.();
    callbacksRef.current.delete(request.requestId);
    if (message) {
      toast.error(message);
    }
    dispatch({ type: "fail", requestId: request.requestId });
  });

  const finishRequest = useEffectEvent((request: NavigationRequest) => {
    callbacksRef.current.get(request.requestId)?.acknowledge?.();
    callbacksRef.current.delete(request.requestId);
    dispatch({ type: "finish", requestId: request.requestId });
  });

  useEffect(() => {
    if (state.phase !== "preparing-view") {
      return;
    }

    if (visibility !== "active") {
      setVisibility("active");
    }
    if (selectedTagIds.length > 0) {
      setSelectedTagIds([]);
    }
    if (isActiveUnfiltered) {
      dispatch({ type: "view-ready", requestId: state.request.requestId });
    }
  }, [
    isActiveUnfiltered,
    selectedTagIds.length,
    setSelectedTagIds,
    setVisibility,
    state,
    visibility,
  ]);

  useEffect(() => {
    if (state.phase !== "resolving-target") {
      return;
    }

    let cancelled = false;
    const { request } = state;

    async function resolveTarget(): Promise<void> {
      if (request.kind === "located-block") {
        dispatch({
          type: "target-resolved",
          requestId: request.requestId,
          target: { blockId: request.blockId, index: request.index },
        });
        return;
      }

      if (request.kind === "index") {
        if (request.index < 0) {
          failRequest(request);
          return;
        }
        const block = getBlockAtIndex(request.index);
        if (block) {
          dispatch({
            type: "target-resolved",
            requestId: request.requestId,
            target: { blockId: block.id, index: request.index },
          });
          return;
        }
        const loadedBlock = await ensureBlockIndexLoaded(request.index);
        if (cancelled) return;
        if (!loadedBlock) {
          failRequest(request);
          return;
        }
        dispatch({
          type: "target-resolved",
          requestId: request.requestId,
          target: { blockId: loadedBlock.id, index: request.index },
        });
        return;
      }

      const result = await locateBlockInView(request.blockId);
      if (cancelled) return;
      if (!result || result.block.id !== request.blockId) {
        failRequest(request, "Block not found");
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
        failRequest(request, "Failed to locate block");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ensureBlockIndexLoaded, failRequest, getBlockAtIndex, locateBlockInView, state]);

  useEffect(() => {
    if (state.phase !== "ensuring-page") {
      return;
    }

    let cancelled = false;
    const { request, target } = state;

    void ensureBlockIndexLoaded(target.index)
      .then((loadedBlock) => {
        if (cancelled) return;
        const block = loadedBlock ?? getBlockAtIndex(target.index);
        if (!block) {
          failRequest(request);
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
          failRequest(request, "Failed to load block");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ensureBlockIndexLoaded, failRequest, getBlockAtIndex, state]);

  useEffect(() => {
    if (state.phase !== "focusing") {
      return;
    }

    const { request, target } = state;
    if (request.focus !== "none") {
      setActiveBlockId(target.blockId);
    }
    if (request.focus === "editor") {
      registry.requestEditorFocus(target.blockId, request.requestId);
    }
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

  const targetRendered = useCallback((payload: BlockScrollTargetRenderedPayload) => {
    dispatch({
      type: "target-rendered",
      requestId: payload.requestId,
      target: { blockId: payload.blockId, index: payload.index },
    });
  }, []);

  return {
    activeBlockId,
    navigateToBlock,
    navigateToIndex,
    navigateToLocatedBlock,
    scrollTarget,
    setActiveBlockId,
    targetRendered,
  };
}
