import type { ShortcutBinding } from "@fluxnotes/shared/shortcuts";
import type { LucideIcon } from "@fluxnotes/ui/icons/lucide";
import type { MessageDescriptor } from "@lingui/core";
import type { LexicalEditor } from "lexical";

import type { BlockEditorActionId } from "./shortcuts";

export type { BlockEditorActionId };

export type BlockEditorActionFocus = "editor" | "managed";
export type BlockEditorShortcutConfig = Partial<Record<BlockEditorActionId, ShortcutBinding>>;

export interface BlockEditorActionContext {
  editor: LexicalEditor;
}

export type BlockEditorActionResult =
  | { action: BlockEditorActionId; status: "disabled" }
  | {
      action: BlockEditorActionId;
      focus: BlockEditorActionFocus;
      status: "executed";
    }
  | { action: string; status: "unknown" };

export interface BlockEditorActionDefinition {
  icon: LucideIcon;
  id: BlockEditorActionId;
  isActive: (context: BlockEditorActionContext) => boolean;
  isDisabled: (context: BlockEditorActionContext) => boolean;
  label: MessageDescriptor;
  execute: (context: BlockEditorActionContext) => BlockEditorActionResult;
}

export interface BlockEditorActionState {
  activeActions: Record<BlockEditorActionId, boolean>;
  disabledActions: Record<BlockEditorActionId, boolean>;
}

export type BlockEditorActionStateListener = (state: BlockEditorActionState) => void;

export interface BlockEditorActionController {
  executeAction: (action: BlockEditorActionId) => BlockEditorActionResult;
  focus: () => void;
  getActionState: () => BlockEditorActionState;
  subscribeActionState: (listener: BlockEditorActionStateListener) => () => void;
}
