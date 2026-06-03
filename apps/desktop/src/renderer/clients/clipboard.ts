import { clipboardContract } from "@shared/features/clipboard/contract";
import type { z } from "zod";

import { invokeCommand } from "./ipc/invoke";

export type BlockEditorClipboardWriteRequest = z.infer<
  (typeof clipboardContract)["commands"]["clipboard.write"]["input"]
>;

export const writeBlockEditorClipboard = (
  request: BlockEditorClipboardWriteRequest,
): Promise<void> => invokeCommand("clipboard.write", request);
