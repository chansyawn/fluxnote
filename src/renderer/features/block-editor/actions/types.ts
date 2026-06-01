import type { MessageDescriptor } from "@lingui/core";
import type { ShortcutBinding } from "@renderer/features/shortcut/shortcut-utils";
import type { ShortcutAction } from "@shared/features/preferences/user-preferences";
import type { LexicalEditor } from "lexical";
import type { LucideIcon } from "lucide-react";

import type {
  BlockEditorBlockFormat,
  BlockEditorFormat,
  BlockEditorInlineFormat,
} from "../toolbar/types";

export type BlockEditorActionId = Extract<ShortcutAction, `editor.${string}`>;
export type BlockEditorShortcutConfig = Partial<Record<BlockEditorActionId, ShortcutBinding>>;

export type BlockEditorActionGroup = "text-style" | "list" | "block-button" | "inline";

export interface BlockEditorActionContext {
  editor: LexicalEditor;
}

export type BlockEditorActionResult =
  | { action: BlockEditorActionId; status: "disabled" }
  | { action: BlockEditorActionId; status: "executed" }
  | { action: string; status: "unknown" };

export interface BlockEditorActionDefinition<
  TFormat extends BlockEditorFormat = BlockEditorFormat,
> {
  format: TFormat;
  group: BlockEditorActionGroup;
  icon: LucideIcon;
  id: BlockEditorActionId;
  isDisabled: (context: BlockEditorActionContext) => boolean;
  kind: TFormat extends BlockEditorBlockFormat ? "block-format" : "inline-format";
  label: MessageDescriptor;
  execute: (context: BlockEditorActionContext) => BlockEditorActionResult;
}

export interface BlockEditorActionState {
  blockFormat: BlockEditorBlockFormat;
  disabledActions: Record<BlockEditorActionId, boolean>;
  inlineFormats: Record<BlockEditorInlineFormat, boolean>;
}

export type BlockEditorActionStateListener = (state: BlockEditorActionState) => void;

export interface BlockEditorActionController {
  executeAction: (action: BlockEditorActionId) => BlockEditorActionResult;
  focus: () => void;
  getActionState: () => BlockEditorActionState;
  subscribeActionState: (listener: BlockEditorActionStateListener) => () => void;
}
