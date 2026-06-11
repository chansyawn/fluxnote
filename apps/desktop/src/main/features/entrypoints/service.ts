import type { AppDatabase } from "@main/core/database";
import type {
  BackendCommandResponse,
  ParsedBackendCommandRequest,
} from "@shared/features/entrypoints/commands";
import type {
  CliExternalEditOrigin,
  ExternalEditResult,
} from "@shared/features/external-edit/models";
import type { BlockCreatedSource } from "@shared/features/telemetry/contract";

import { createBlockRecord } from "../blocks/service";
import { setBlockTagsByName } from "../tags/service";
import type { TelemetryService } from "../telemetry";

interface EntrypointServiceDeps {
  createExternalEditSession: (
    blockId: string,
    origin: CliExternalEditOrigin,
    signal?: AbortSignal,
  ) => Promise<ExternalEditResult>;
  getDb: () => Promise<AppDatabase>;
  requestOpenBlock: (blockId: string) => void;
  showMainWindow: () => void;
  telemetryService: Pick<TelemetryService, "captureEvent">;
}

type BlockCreationRequest = ParsedBackendCommandRequest<"block.create-from-text">;

export function createEntrypointService(services: EntrypointServiceDeps) {
  async function createBlock(
    request: Pick<BlockCreationRequest, "content" | "tagNames">,
    source: BlockCreatedSource,
  ): Promise<{ blockId: string }> {
    const db = await services.getDb();
    const block = await createBlockRecord(db, request.content);
    if (request.tagNames && request.tagNames.length > 0) {
      await setBlockTagsByName(db, block.id, request.tagNames);
    }
    services.telemetryService.captureEvent("block_created", { source });
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
    return await createBlock(request, request.blockCreatedSource);
  }

  async function createExternalEdit(
    request: ParsedBackendCommandRequest<"block.create-external-edit">,
    signal?: AbortSignal,
  ): Promise<BackendCommandResponse<"block.create-external-edit">> {
    const { blockId } = await createBlock(request, "cli_external_edit");
    return await services.createExternalEditSession(blockId, request.origin, signal);
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
