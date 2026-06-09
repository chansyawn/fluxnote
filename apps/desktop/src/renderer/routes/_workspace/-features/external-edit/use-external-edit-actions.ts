import type { ExternalEditSession } from "@renderer/clients";

import type { WorkspaceBlockEditorHandle } from "../editor/workspace-block-editor-surface";
import { useExternalEditSubmission } from "./external-edit-submission";
import { useSubmittableBlockContent } from "./submittable-block-content";

interface UseExternalEditActionsParams {
  getEditor: (blockId: string) => WorkspaceBlockEditorHandle | undefined;
  navigateToBlock?: (blockId: string) => Promise<void>;
}

interface UseExternalEditActionsResult {
  pendingExternalEditIds: Set<string>;
  handleCancelExternalEdit: (editId: string) => Promise<void>;
  handleSubmitExternalEdit: (
    blockId: string,
    editId: string,
    session?: ExternalEditSession,
  ) => Promise<void>;
}

export function useExternalEditActions({
  getEditor,
  navigateToBlock,
}: UseExternalEditActionsParams): UseExternalEditActionsResult {
  const submittableBlockContent = useSubmittableBlockContent({ getEditor });
  const submission = useExternalEditSubmission({
    getEditor,
    submittableBlockContent,
    navigateToBlock,
  });

  return {
    pendingExternalEditIds: submission.pendingExternalEditIds,
    handleCancelExternalEdit: submission.cancelExternalEdit,
    handleSubmitExternalEdit: submission.submitExternalEdit,
  };
}
