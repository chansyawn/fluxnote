import { normalizeExternalMarkdown } from "@renderer/features/block-editor/markdown/external-markdown";
import { useCallback, useMemo } from "react";

import { getCachedWorkspaceBlock } from "../block-collection/workspace-block-collection";
import type { PersistedBlockEditorHandle } from "./persisted-block-editor";

export interface BlockContentSource {
  getSubmittableMarkdown: (blockId: string) => Promise<string | null>;
}

interface UseBlockContentSourceParams {
  getEditor: (blockId: string) => PersistedBlockEditorHandle | undefined;
}

export function useBlockContentSource({
  getEditor,
}: UseBlockContentSourceParams): BlockContentSource {
  const getSubmittableMarkdown = useCallback(
    async (blockId: string) => {
      const editorContent = await getEditor(blockId)?.flush();
      const content = editorContent ?? getCachedWorkspaceBlock(blockId)?.content;
      return content === undefined ? null : normalizeExternalMarkdown(content);
    },
    [getEditor],
  );

  return useMemo(() => ({ getSubmittableMarkdown }), [getSubmittableMarkdown]);
}
