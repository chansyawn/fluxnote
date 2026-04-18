import type { LexicalEditor } from "lexical";

import { materializeClipboardSnapshot } from "./note-editor-clipboard-serialize";
import { collectClipboardSnapshot } from "./note-editor-clipboard-snapshot";
import type { ClipboardCopyScope, ClipboardPayload } from "./note-editor-clipboard-types";
import {
  canWriteClipboardPayloadAsynchronously,
  writeClipboardPayloadToDataTransfer,
  writeClipboardPayloadToNavigatorClipboard,
} from "./note-editor-clipboard-write";

export type { ClipboardCopyScope, ClipboardPayload };
export {
  canWriteClipboardPayloadAsynchronously,
  writeClipboardPayloadToDataTransfer,
  writeClipboardPayloadToNavigatorClipboard,
};

export function collectClipboardPayload(
  editor: LexicalEditor,
  scope: ClipboardCopyScope,
): ClipboardPayload | null {
  const snapshot = editor.read(() => collectClipboardSnapshot(editor, scope));
  if (!snapshot) {
    return null;
  }

  return materializeClipboardSnapshot(snapshot);
}

export async function copyEditorContentToClipboard(
  editor: LexicalEditor,
  scope: ClipboardCopyScope,
): Promise<void> {
  const payload = collectClipboardPayload(editor, scope);
  if (!payload) {
    return;
  }

  const wroteClipboard = await writeClipboardPayloadToNavigatorClipboard(payload);
  if (!wroteClipboard) {
    throw new Error("Clipboard API is not available");
  }
}
