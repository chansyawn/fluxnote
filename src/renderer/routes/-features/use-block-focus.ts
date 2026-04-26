import type { Block, LocateBlockResult } from "@renderer/clients";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { EditorRegistry } from "./use-editor-registry";

interface UseBlockFocusParams {
  registry: EditorRegistry;
  loadedBlocks: Block[];
  getBlockAtIndex: (index: number) => Block | undefined;
  ensureBlockIndexLoaded: (index: number) => Promise<void>;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
  scrollToBlockIndex: (index: number) => void;
}

interface UseBlockFocusResult {
  activeBlockId: string | null;
  setActiveBlockId: (blockId: string | null) => void;
  requestFocus: (blockId: string) => void;
  requestLocatedFocus: (blockId: string, index: number) => void;
  requestFocusAtIndex: (index: number) => void;
}

export function useBlockFocus({
  registry,
  loadedBlocks,
  getBlockAtIndex,
  ensureBlockIndexLoaded,
  locateBlockInView,
  scrollToBlockIndex,
}: UseBlockFocusParams): UseBlockFocusResult {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const pendingIndexRef = useRef<number | null>(null);

  // 路径 A：已知 blockId + index，滚动并请求焦点
  const requestLocatedFocus = useEffectEvent((blockId: string, index: number) => {
    pendingIndexRef.current = null;
    setActiveBlockId(blockId);
    registry.requestEditorFocus(blockId);
    scrollToBlockIndex(index);
    void ensureBlockIndexLoaded(index).then(() => {
      scrollToBlockIndex(index);
      registry.requestEditorFocus(blockId);
    });
  });

  // 路径 A 入口：已知 blockId，先定位再聚焦
  const requestFocus = useEffectEvent((blockId: string) => {
    void locateBlockInView(blockId).then((result) => {
      if (!result) {
        registry.requestEditorFocus(null);
        return;
      }
      requestLocatedFocus(result.block.id, result.index);
    });
  });

  // 路径 B：已知 index 不知 blockId（删除后聚焦下一个）
  const requestFocusAtIndex = useEffectEvent((index: number) => {
    if (index < 0) {
      setActiveBlockId(null);
      return;
    }

    const block = getBlockAtIndex(index);
    if (block) {
      requestLocatedFocus(block.id, index);
      return;
    }

    pendingIndexRef.current = index;
    scrollToBlockIndex(index);
    void ensureBlockIndexLoaded(index);
  });

  // 路径 B 解析：数据加载后将 pending index 转为 blockId，转入路径 A
  useEffect(() => {
    if (pendingIndexRef.current === null) return;

    const block = getBlockAtIndex(pendingIndexRef.current);
    if (block) {
      const index = pendingIndexRef.current;
      pendingIndexRef.current = null;
      requestLocatedFocus(block.id, index);
    }
  }, [loadedBlocks, getBlockAtIndex, requestLocatedFocus]);

  return {
    activeBlockId,
    setActiveBlockId,
    requestFocus,
    requestLocatedFocus,
    requestFocusAtIndex,
  };
}
