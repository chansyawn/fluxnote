import { clipboardContract } from "@shared/features/clipboard/contract";
import type { z } from "zod";

import { invokeCommand } from "./ipc/invoke";

export type BlockEditorClipboardReadResult = z.infer<
  (typeof clipboardContract)["commands"]["clipboard.read"]["output"]
>;
export type BlockEditorClipboardWriteRequest = z.infer<
  (typeof clipboardContract)["commands"]["clipboard.write"]["input"]
>;

export const readBlockEditorClipboard = (): Promise<BlockEditorClipboardReadResult> =>
  invokeCommand("clipboard.read", undefined);

export const writeBlockEditorClipboard = (
  request: BlockEditorClipboardWriteRequest,
): Promise<void> => invokeCommand("clipboard.write", request);
