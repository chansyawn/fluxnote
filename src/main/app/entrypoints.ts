import {
  backendCommandContracts,
  type BackendCommandKey,
  type BackendCommandResponse,
  type ParsedBackendCommandRequest,
} from "@shared/features/entrypoints/commands";
import type { ExternalEditResult } from "@shared/features/external-edit/session-contracts";
import type { IpcResult } from "@shared/ipc/result";
import { businessError, toIpcErrorPayload } from "@shared/ipc/result";
import { ZodError } from "zod";

import type { AppDatabase } from "../core/database";
import { createBlockRecord } from "../features/blocks/service";
import { createCliIpcServer } from "../features/cli/ipc-server";
import { createDeepLinkHandler } from "../features/deep-link/handler";
import { setBlockTagsByName } from "../features/tags/service";

interface EntrypointRuntimeServices {
  createExternalEditSession: (
    blockId: string,
    originalContent: string,
    signal?: AbortSignal,
  ) => Promise<BackendCommandResponse<"block.create-external-edit">>;
  getDb: () => Promise<AppDatabase>;
  requestOpenBlock: (blockId: string) => void;
  showMainWindow: () => void;
}

interface EntrypointDispatcherServices {
  executeCommand: <TKey extends BackendCommandKey>(
    command: TKey,
    request: ParsedBackendCommandRequest<TKey>,
    signal?: AbortSignal,
  ) => Promise<BackendCommandResponse<TKey>>;
}

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

function createEntrypointDispatcher(services: EntrypointDispatcherServices) {
  async function dispatchCommand<TKey extends BackendCommandKey>(
    command: TKey,
    payload: unknown,
    signal?: AbortSignal,
  ): Promise<IpcResult<BackendCommandResponse<TKey>>> {
    try {
      const contract = backendCommandContracts[command];
      let request: ParsedBackendCommandRequest<TKey>;

      try {
        request = contract.request.parse(payload) as ParsedBackendCommandRequest<TKey>;
      } catch (error) {
        if (error instanceof ZodError) {
          throw businessError("BUSINESS.INVALID_INVOKE", "Invalid command payload", {
            command,
            issues: error.issues,
          });
        }
        throw error;
      }

      const response = await services.executeCommand(command, request, signal);
      const data = contract.response.parse(response) as BackendCommandResponse<TKey>;
      return { data, ok: true };
    } catch (error) {
      return {
        error: toIpcErrorPayload(error),
        ok: false,
      };
    }
  }

  return { dispatchCommand };
}

function createEntrypointCommandExecutor(services: EntrypointCommandServices) {
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
        const { content, tagNames } =
          request as ParsedBackendCommandRequest<"block.create-from-text">;
        const db = await services.getDb();
        const block = await createBlockRecord(db, content);
        if (tagNames && tagNames.length > 0) {
          await setBlockTagsByName(db, block.id, tagNames);
        }
        services.requestOpenBlock(block.id);
        return { blockId: block.id } as BackendCommandResponse<TKey>;
      }
      case "block.create-external-edit": {
        const { content, tagNames } =
          request as ParsedBackendCommandRequest<"block.create-external-edit">;
        const db = await services.getDb();
        const block = await createBlockRecord(db, content);
        if (tagNames && tagNames.length > 0) {
          await setBlockTagsByName(db, block.id, tagNames);
        }
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

export function createEntrypointRuntime(services: EntrypointRuntimeServices) {
  const commandExecutor = createEntrypointCommandExecutor({
    createExternalEditSession: services.createExternalEditSession,
    getDb: services.getDb,
    requestOpenBlock: services.requestOpenBlock,
    showMainWindow: services.showMainWindow,
  });
  const dispatcher = createEntrypointDispatcher({
    executeCommand: commandExecutor.execute,
  });
  const deepLinkHandler = createDeepLinkHandler({
    dispatchEnvelope: (envelope) => dispatcher.dispatchCommand(envelope.command, envelope.payload),
  });
  const cliIpcServer = createCliIpcServer({
    dispatchCommand: dispatcher.dispatchCommand,
  });

  function dispatchCommand<TKey extends BackendCommandKey>(
    command: TKey,
    payload: unknown,
    signal?: AbortSignal,
  ): Promise<IpcResult<BackendCommandResponse<TKey>>> {
    return dispatcher.dispatchCommand(command, payload, signal);
  }

  async function startCliServer(): Promise<void> {
    await cliIpcServer.start();
  }

  async function stopCliServer(): Promise<void> {
    await cliIpcServer.close();
  }

  return {
    dispatchCommand,
    handleDeepLink: deepLinkHandler.handle,
    startCliServer,
    stopCliServer,
  };
}
