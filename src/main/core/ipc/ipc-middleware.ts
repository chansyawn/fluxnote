import { businessError, toIpcErrorPayload, type IpcResult } from "@shared/ipc/result";
import {
  contracts,
  type CommandInput,
  type CommandName,
  type CommandOutput,
} from "@shared/ipc/types";
import type { IpcMainInvokeEvent, WebContents } from "electron";

export interface IpcMiddlewareContext {
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean;
  parseInput: <T extends CommandName>(name: T, rawInput: unknown) => CommandInput<T>;
  parseOutput: <T extends CommandName>(name: T, output: unknown) => CommandOutput<T>;
  mapError: (error: unknown) => IpcResult<unknown>;
}

interface CreateIpcMiddlewareContextOptions {
  isSenderTrusted: (sender: WebContents) => boolean;
}

export function createIpcMiddlewareContext(
  options: CreateIpcMiddlewareContextOptions,
): IpcMiddlewareContext {
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
