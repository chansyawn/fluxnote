import type { AppContext } from "@main/core/context";
import { businessError, toIpcErrorPayload, type IpcResult } from "@shared/ipc/result";
import {
  contracts,
  type CommandInput,
  type CommandName,
  type CommandOutput,
} from "@shared/ipc/types";
import { ipcMain } from "electron";

type CommandHandler<T extends CommandName> = (
  input: CommandInput<T>,
  ctx: AppContext,
) => Promise<CommandOutput<T>> | CommandOutput<T>;

export function createIpcRouter(ctx: AppContext) {
  const handlers = new Map<CommandName, CommandHandler<CommandName>>();

  function command<T extends CommandName>(name: T, handler: CommandHandler<T>): void {
    handlers.set(name, handler as CommandHandler<CommandName>);
  }

  function register(): void {
    for (const [name, handler] of handlers) {
      ipcMain.handle(name, async (event, rawInput): Promise<IpcResult<unknown>> => {
        try {
          if (!ctx.events.isSenderTrusted(event.sender)) {
            throw businessError("BUSINESS.INVALID_INVOKE", "Untrusted IPC sender");
          }

          const contract = contracts.commands[name];
          const input = contract.input.parse(rawInput) as CommandInput<typeof name>;
          const output = await handler(input, ctx);
          const data = contract.output.parse(output);

          return {
            ok: true,
            data,
          };
        } catch (error) {
          return {
            ok: false,
            error: toIpcErrorPayload(error),
          };
        }
      });
    }
  }

  return {
    command,
    register,
  };
}
