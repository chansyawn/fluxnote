import type { Block } from "@renderer/clients";
import { memo } from "react";

import { WorkspaceBlockEditor } from "../editing/workspace-block-editor";
import {
  useWorkspaceBlockState,
  useWorkspaceCommands,
  useWorkspaceTags,
} from "../workspace-state-context";

function BlockListPlaceholder() {
  return <div className="bg-card/40 border-border/50 min-h-28 rounded-xl border border-dashed" />;
}

function BlockListItem({ block }: { block: Block }) {
  const commands = useWorkspaceCommands();
  const tags = useWorkspaceTags();
  const state = useWorkspaceBlockState(block.id);

  return <WorkspaceBlockEditor block={block} commands={commands} tags={tags} state={state} />;
}

interface BlockListRowProps {
  block: Block | undefined;
}

export const BlockListRow = memo(function BlockListRow({ block }: BlockListRowProps) {
  if (!block) return <BlockListPlaceholder />;
  return <BlockListItem block={block} />;
});
