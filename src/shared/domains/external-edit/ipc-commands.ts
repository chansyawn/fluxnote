import { z } from "zod";

import { blockSchema } from "../blocks/models";
import { externalEditSessionSchema } from "./session-contracts";

const voidSchema = z.undefined();

export const externalEditIpcCommandContracts = {
  externalEditsCancel: {
    channel: "fluxnote:external-edits:cancel",
    request: z.object({
      editId: z.string().min(1),
    }),
    response: voidSchema,
  },
  externalEditsList: {
    channel: "fluxnote:external-edits:list",
    request: voidSchema,
    response: z.array(externalEditSessionSchema),
  },
  externalEditsSubmit: {
    channel: "fluxnote:external-edits:submit",
    request: z.object({
      editId: z.string().min(1),
      content: z.string(),
    }),
    response: blockSchema,
  },
} as const;
