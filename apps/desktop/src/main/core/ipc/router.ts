import { businessError, toIpcErrorPayload, type IpcResult } from "@shared/ipc/result";
import {
  contracts,
  type CommandInput,
  type CommandName,
  type CommandOutput,
} from "@shared/ipc/types";
import { ipcMain, type IpcMainInvokeEvent, type WebContents } from "electron";

type IpcHandler<I, O> = (input: I) => Promise<O> | O;

type CommandHandler<T extends CommandName> = IpcHandler<CommandInput<T>, CommandOutput<T>>;

interface CreateIpcRouterOptions {
  isSenderTrusted: (sender: WebContents) => boolean;
}

interface IpcMiddlewareContext {
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean;
  parseInput: <T extends CommandName>(name: T, rawInput: unknown) => CommandInput<T>;
  parseOutput: <T extends CommandName>(name: T, output: unknown) => CommandOutput<T>;
  mapError: (error: unknown) => IpcResult<unknown>;
}

function createIpcMiddlewareContext(options: CreateIpcRouterOptions): IpcMiddlewareContext {
  return {
    isTrustedSender: (event) => options.isSenderTrusted(event.sender),
    parseInput: (name, rawInput) => {
      const parseResult = contracts.commands[name].input.safeParse(rawInput);
      if (!parseResult.success) {
        throw businessError("BUSINESS.INVALID_INVOKE", "Invalid IPC command input", {
          command: name,
          issues: parseResult.error.issues,
        });
      }

      return parseResult.data as CommandInput<typeof name>;
    },
    parseOutput: (name, output) => {
      return contracts.commands[name].output.parse(output) as CommandOutput<typeof name>;
    },
    mapError: (error) => ({
      ok: false,
      error: toIpcErrorPayload(error),
    }),
  };
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
