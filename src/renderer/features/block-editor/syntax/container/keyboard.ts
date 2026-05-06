import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COLLABORATION_TAG,
  HISTORIC_TAG,
  type LexicalEditor,
  type NodeKey,
} from "lexical";

interface PendingShortcutSelection {
  anchorKey: NodeKey;
  anchorOffset: number;
}

function readPendingShortcutSelection(
  dirtyLeaves: ReadonlySet<NodeKey>,
): PendingShortcutSelection | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchorNode = $getNodeByKey(selection.anchor.key);
  if (
    !$isTextNode(anchorNode) ||
    !anchorNode.isAttached() ||
    !dirtyLeaves.has(anchorNode.getKey())
  ) {
    return null;
  }

  return {
    anchorKey: anchorNode.getKey(),
    anchorOffset: selection.anchor.offset,
  };
}

function restoreShortcutSelection({ anchorKey, anchorOffset }: PendingShortcutSelection): boolean {
  const node = $getNodeByKey(anchorKey);
  if (!$isTextNode(node) || !node.isAttached()) {
    return false;
  }

  node.select(anchorOffset, anchorOffset);
  return true;
}

export function registerContainerShortcutReplay(
  editor: LexicalEditor,
  applyShortcut: () => boolean,
): () => void {
  return editor.registerUpdateListener(({ dirtyLeaves, editorState, tags }) => {
    if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG) || dirtyLeaves.size === 0) {
      return;
    }

    const pending = editorState.read(() => readPendingShortcutSelection(dirtyLeaves));
    if (!pending) {
      return;
    }

    editor.update(
      () => {
        if (restoreShortcutSelection(pending)) {
          applyShortcut();
        }
      },
      { discrete: true },
    );
  });
}
