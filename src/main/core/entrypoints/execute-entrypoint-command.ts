import type {
  BackendCommandKey,
  BackendCommandResponse,
  ParsedBackendCommandRequest,
} from "@shared/features/entrypoints/commands";
import type { ExternalEditResult } from "@shared/features/external-edit/session-contracts";

import { createBlockRecord } from "../../features/blocks/service";
import type { AppDatabase } from "../database/database-client";

interface EntrypointCommandServices {
  createExternalEditSession: (
    blockId: string,
    originalContent: string,
    signal?: AbortSignal,
  ) => Promise<ExternalEditResult>;
  getDb: () => Promise<AppDatabase>;
  requestOpenBlock: (blockId: string) => void;
  showMainWindow: () => void;
}

export type EntrypointCommandExecutor = ReturnType<typeof createEntrypointCommandExecutor>;

export function createEntrypointCommandExecutor(services: EntrypointCommandServices) {
  async function execute<TKey extends BackendCommandKey>(
    command: TKey,
    request: ParsedBackendCommandRequest<TKey>,
    signal?: AbortSignal,
  ): Promise<BackendCommandResponse<TKey>> {
    switch (command) {
      case "app.open": {
        services.showMainWindow();
        return null as BackendCommandResponse<TKey>;
      }
      case "block.create-from-text": {
        const { content } = request as ParsedBackendCommandRequest<"block.create-from-text">;
        const block = await createBlockRecord(await services.getDb(), content);
        services.requestOpenBlock(block.id);
        return { blockId: block.id } as BackendCommandResponse<TKey>;
      }
      case "block.create-external-edit": {
        const { content } = request as ParsedBackendCommandRequest<"block.create-external-edit">;
        const block = await createBlockRecord(await services.getDb(), content);
        const result = services.createExternalEditSession(block.id, content, signal);
        services.requestOpenBlock(block.id);
        return (await result) as BackendCommandResponse<TKey>;
      }
      case "block.open": {
        const { blockId } = request as ParsedBackendCommandRequest<"block.open">;
        services.requestOpenBlock(blockId);
        return null as BackendCommandResponse<TKey>;
      }
    }
  }

  return { execute };
}
