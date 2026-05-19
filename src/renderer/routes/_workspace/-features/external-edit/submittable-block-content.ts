import { normalizeExternalMarkdown } from "@renderer/features/block-editor/markdown/external-markdown";
import { useCallback, useMemo } from "react";

import { getCachedWorkspaceBlock } from "../block-collection/workspace-block-cache";
import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";

export interface SubmittableBlockContent {
  getSubmittableMarkdown: (blockId: string) => Promise<string | null>;
}

interface UseSubmittableBlockContentParams {
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
}

export function useSubmittableBlockContent({
  getEditor,
}: UseSubmittableBlockContentParams): SubmittableBlockContent {
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
