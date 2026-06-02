import {
  backendCommandContracts,
  type BackendCommandKey,
  type BackendCommandResponse,
  type ParsedBackendCommandRequest,
} from "@shared/features/entrypoints/commands";
import type { ExternalEditTrigger } from "@shared/features/external-edit/session-contracts";
import type { IpcResult } from "@shared/ipc/result";
import { businessError, toIpcErrorPayload } from "@shared/ipc/result";
import { ZodError } from "zod";

import type { AppDatabase } from "../core/database";
import { createCliIpcServer } from "../features/cli/ipc-server";
import { createDeepLinkHandler } from "../features/deep-link/handler";
import { createEntrypointService, type EntrypointService } from "../features/entrypoints/service";
import type { TelemetryService } from "../features/telemetry";

interface EntrypointRuntimeServices {
  createExternalEditSession: (
    blockId: string,
    originalContent: string,
    trigger: ExternalEditTrigger,
    signal?: AbortSignal,
  ) => Promise<BackendCommandResponse<"block.create-external-edit">>;
  getDb: () => Promise<AppDatabase>;
  requestOpenBlock: (blockId: string) => void;
  showMainWindow: () => void;
  telemetryService: Pick<TelemetryService, "captureEvent">;
}

interface EntrypointDispatcherServices {
  executeCommand: <TKey extends BackendCommandKey>(
    command: TKey,
    request: ParsedBackendCommandRequest<TKey>,
    signal?: AbortSignal,
  ) => Promise<BackendCommandResponse<TKey>>;
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

function createEntrypointCommandExecutor(service: EntrypointService) {
  async function execute<TKey extends BackendCommandKey>(
    command: TKey,
    request: ParsedBackendCommandRequest<TKey>,
    signal?: AbortSignal,
  ): Promise<BackendCommandResponse<TKey>> {
    switch (command) {
      case "app.open": {
        return service.openApp() as BackendCommandResponse<TKey>;
      }
      case "block.create-from-text": {
        return (await service.createBlockFromText(
          request as ParsedBackendCommandRequest<"block.create-from-text">,
        )) as BackendCommandResponse<TKey>;
      }
      case "block.create-external-edit": {
        return (await service.createExternalEdit(
          request as ParsedBackendCommandRequest<"block.create-external-edit">,
          signal,
        )) as BackendCommandResponse<TKey>;
      }
      case "block.open": {
        return service.openBlock(
          request as ParsedBackendCommandRequest<"block.open">,
        ) as BackendCommandResponse<TKey>;
      }
    }
  }

  return { execute };
}

export function createEntrypointRuntime(services: EntrypointRuntimeServices) {
  const entrypointService = createEntrypointService({
    createExternalEditSession: services.createExternalEditSession,
    getDb: services.getDb,
    requestOpenBlock: services.requestOpenBlock,
    showMainWindow: services.showMainWindow,
    telemetryService: services.telemetryService,
  });
  const commandExecutor = createEntrypointCommandExecutor(entrypointService);
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
