import { businessError, type IpcResult } from "@shared/ipc/result";
import { type CommandInput, type CommandName, type CommandOutput } from "@shared/ipc/types";
import { ipcMain, type WebContents } from "electron";

import { createIpcMiddlewareContext } from "./ipc-middleware";

type IpcHandler<I, O> = (input: I) => Promise<O> | O;

type CommandHandler<T extends CommandName> = IpcHandler<CommandInput<T>, CommandOutput<T>>;

interface CreateIpcRouterOptions {
  isSenderTrusted: (sender: WebContents) => boolean;
}

export function createIpcRouter(options: CreateIpcRouterOptions) {
  const handlers = new Map<CommandName, CommandHandler<CommandName>>();
  const middleware = createIpcMiddlewareContext(options);

  function command<T extends CommandName>(name: T, handler: CommandHandler<T>): void {
    handlers.set(name, handler as CommandHandler<CommandName>);
  }

  function register(): void {
    for (const [name, handler] of handlers) {
      ipcMain.handle(name, async (event, rawInput): Promise<IpcResult<unknown>> => {
        try {
          if (!middleware.isTrustedSender(event)) {
            throw businessError("BUSINESS.INVALID_INVOKE", "Untrusted IPC sender");
          }

          const input = middleware.parseInput(name, rawInput);
          const output = await handler(input);
          const data = middleware.parseOutput(name, output);

          return {
            ok: true,
            data,
          };
        } catch (error) {
          return middleware.mapError(error);
        }
      });
    }
  }

  return {
    command,
    register,
  };
}

export type IpcRouter = ReturnType<typeof createIpcRouter>;
