import { toAppInvokeError } from "@renderer/app/invoke";
import { queryClient } from "@renderer/app/query";
import { cancelExternalEdit, submitExternalEdit, type ListBlocksResult } from "@renderer/clients";
import type { NoteBlockEditorHandle } from "@renderer/features/note-block/note-block-editor";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseExternalEditActionsParams {
  editorRefs: React.RefObject<Map<string, NoteBlockEditorHandle>>;
}

interface UseExternalEditActionsResult {
  pendingExternalEditIds: Set<string>;
  handleCancelExternalEdit: (editId: string) => Promise<void>;
  handleSubmitExternalEdit: (blockId: string, editId: string) => Promise<void>;
}

export function useExternalEditActions({
  editorRefs,
}: UseExternalEditActionsParams): UseExternalEditActionsResult {
  const [pendingExternalEditIds, setPendingExternalEditIds] = useState<Set<string>>(
    () => new Set(),
  );

  const handleCancelExternalEdit = useCallback(async (editId: string) => {
    setPendingExternalEditIds((current) => new Set(current).add(editId));
    try {
      await cancelExternalEdit({ editId });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    } catch (error) {
      toast.error(toAppInvokeError(error).message);
    } finally {
      setPendingExternalEditIds((current) => {
        const next = new Set(current);
        next.delete(editId);
        return next;
      });
    }
  }, []);

  const handleSubmitExternalEdit = useCallback(
    async (blockId: string, editId: string) => {
      setPendingExternalEditIds((current) => new Set(current).add(editId));
      try {
        const editorContent = await editorRefs.current.get(blockId)?.flushPendingMarkdown();
        let content = editorContent;
        if (content === undefined) {
          for (const [, cached] of queryClient.getQueriesData<ListBlocksResult>({
            queryKey: ["blocks"],
          })) {
            const found = cached?.blocks.find((b) => b.id === blockId);
            if (found) {
              content = found.content;
              break;
            }
          }
        }
        if (content === undefined) {
          toast.error("Cannot submit: block content unavailable.");
          return;
        }
        await submitExternalEdit({ content, editId });
        void queryClient.invalidateQueries({ queryKey: ["blocks"] });
      } catch (error) {
        toast.error(toAppInvokeError(error).message);
      } finally {
        setPendingExternalEditIds((current) => {
          const next = new Set(current);
          next.delete(editId);
          return next;
        });
      }
    },
    [editorRefs],
  );

  return {
    pendingExternalEditIds,
    handleCancelExternalEdit,
    handleSubmitExternalEdit,
  };
}
