import type {
  BackendCommandKey,
  BackendCommandResponse,
} from "@shared/features/entrypoints/commands";
import type { IpcResult } from "@shared/ipc/result";

import { createCliIpcServer } from "../../features/cli/ipc-server";
import { createDeepLinkHandler } from "../../features/deep-link/handler";
import type { AppDatabase } from "../database/database-client";
import { createEntrypointDispatcher } from "./dispatch-entrypoint";
import { createEntrypointCommandExecutor } from "./execute-entrypoint-command";

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
