import type { Block } from "@renderer/clients";
import { memo } from "react";

import type { BlockActionPosition } from "../adornments/block-actions";
import { WorkspaceBlockEditor } from "../editor/workspace-block-editor";
import {
  useWorkspaceBlockState,
  useWorkspaceCommands,
  useWorkspaceTags,
} from "../workspace-state-context";

function BlockListPlaceholder() {
  return (
    <div className="bg-card relative min-h-24 rounded-lg border border-dashed opacity-40 transition-opacity" />
  );
}

function BlockListItem({ block, position }: { block: Block; position: BlockActionPosition }) {
  const commands = useWorkspaceCommands();
  const tags = useWorkspaceTags();
  const state = useWorkspaceBlockState(block.id);

  return (
    <WorkspaceBlockEditor
      block={block}
      commands={commands}
      position={position}
      tags={tags}
      state={state}
    />
  );
}

interface BlockListRowProps {
  block: Block | undefined;
  position: BlockActionPosition;
}

export const BlockListRow = memo(function BlockListRow({ block, position }: BlockListRowProps) {
  if (!block) return <BlockListPlaceholder />;
  return <BlockListItem block={block} position={position} />;
});
