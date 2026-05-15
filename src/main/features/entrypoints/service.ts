import type { AppDatabase } from "@main/core/database";
import type {
  BackendCommandResponse,
  ParsedBackendCommandRequest,
} from "@shared/features/entrypoints/commands";
import type { ExternalEditResult } from "@shared/features/external-edit/session-contracts";

import { createBlockRecord } from "../blocks/service";
import { setBlockTagsByName } from "../tags/service";

interface EntrypointServiceDeps {
  createExternalEditSession: (
    blockId: string,
    originalContent: string,
    signal?: AbortSignal,
  ) => Promise<ExternalEditResult>;
  getDb: () => Promise<AppDatabase>;
  requestOpenBlock: (blockId: string) => void;
  showMainWindow: () => void;
}

type BlockCreationRequest = ParsedBackendCommandRequest<"block.create-from-text">;

export function createEntrypointService(services: EntrypointServiceDeps) {
  async function createBlock(request: BlockCreationRequest): Promise<{ blockId: string }> {
    const db = await services.getDb();
    const block = await createBlockRecord(db, request.content);
    if (request.tagNames && request.tagNames.length > 0) {
      await setBlockTagsByName(db, block.id, request.tagNames);
    }
    services.requestOpenBlock(block.id);
    return { blockId: block.id };
  }

  function openApp(): BackendCommandResponse<"app.open"> {
    services.showMainWindow();
    return null;
  }

  async function createBlockFromText(
    request: ParsedBackendCommandRequest<"block.create-from-text">,
  ): Promise<BackendCommandResponse<"block.create-from-text">> {
    return await createBlock(request);
  }

  async function createExternalEdit(
    request: ParsedBackendCommandRequest<"block.create-external-edit">,
    signal?: AbortSignal,
  ): Promise<BackendCommandResponse<"block.create-external-edit">> {
    const { blockId } = await createBlock(request);
    return await services.createExternalEditSession(blockId, request.content, signal);
  }

  function openBlock(
    request: ParsedBackendCommandRequest<"block.open">,
  ): BackendCommandResponse<"block.open"> {
    services.requestOpenBlock(request.blockId);
    return null;
  }

  return {
    createBlockFromText,
    createExternalEdit,
    openApp,
    openBlock,
  };
}

export type EntrypointService = ReturnType<typeof createEntrypointService>;
