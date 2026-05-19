import { useBlockContentSource } from "./block-content-source";
import { useExternalEditSubmission } from "./external-edit-submission";
import type { PersistedBlockEditorHandle } from "./persisted-block-editor";

interface UseExternalEditActionsParams {
  getEditor: (blockId: string) => PersistedBlockEditorHandle | undefined;
  navigateToBlock?: (blockId: string) => Promise<void>;
}

interface UseExternalEditActionsResult {
  pendingExternalEditIds: Set<string>;
  handleCancelExternalEdit: (editId: string) => Promise<void>;
  handleSubmitExternalEdit: (blockId: string, editId: string) => Promise<void>;
}

export function useExternalEditActions({
  getEditor,
  navigateToBlock,
}: UseExternalEditActionsParams): UseExternalEditActionsResult {
  const blockContentSource = useBlockContentSource({ getEditor });
  const submission = useExternalEditSubmission({ blockContentSource, navigateToBlock });

  return {
    pendingExternalEditIds: submission.pendingExternalEditIds,
    handleCancelExternalEdit: submission.cancelExternalEdit,
    handleSubmitExternalEdit: submission.submitExternalEdit,
  };
}
