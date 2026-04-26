import {
  backendCommandContracts,
  type BackendCommandKey,
  type BackendCommandResponse,
  type ParsedBackendCommandRequest,
} from "@shared/backend-command-contracts";
import type { ExternalEditResult } from "@shared/external-edit-contracts";

import { createBlockRecord } from "./blocks/block-service";
import type { AppDatabase } from "./database/database-client";

interface BackendCommandServices {
  createExternalEditSession: (
    blockId: string,
    originalContent: string,
    signal?: AbortSignal,
  ) => Promise<ExternalEditResult>;
  getDb: () => Promise<AppDatabase>;
  requestOpenBlock: (blockId: string) => void;
  showMainWindow: () => void;
}

export type BackendCommandDispatcher = ReturnType<typeof createBackendCommandDispatcher>;

export function createBackendCommandDispatcher(services: BackendCommandServices) {
  async function dispatch<TKey extends BackendCommandKey>(
    command: TKey,
    payload: unknown,
    signal?: AbortSignal,
  ): Promise<BackendCommandResponse<TKey>> {
    const contract = backendCommandContracts[command];
    const request = contract.request.parse(payload) as ParsedBackendCommandRequest<TKey>;

    switch (command) {
      case "app.open": {
        services.showMainWindow();
        return contract.response.parse(null) as BackendCommandResponse<TKey>;
      }
      case "block.createFromText": {
        const { content } = request as ParsedBackendCommandRequest<"block.createFromText">;
        const block = createBlockRecord(await services.getDb(), content);
        services.requestOpenBlock(block.id);
        return contract.response.parse({ blockId: block.id }) as BackendCommandResponse<TKey>;
      }
      case "block.createExternalEdit": {
        const { content } = request as ParsedBackendCommandRequest<"block.createExternalEdit">;
        const block = createBlockRecord(await services.getDb(), content);
        const result = services.createExternalEditSession(block.id, content, signal);
        services.requestOpenBlock(block.id);
        return contract.response.parse(await result) as BackendCommandResponse<TKey>;
      }
      case "block.open": {
        const { blockId } = request as ParsedBackendCommandRequest<"block.open">;
        services.requestOpenBlock(blockId);
        return contract.response.parse(null) as BackendCommandResponse<TKey>;
      }
    }
  }

  return { dispatch };
}
