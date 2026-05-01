import {
  backendCommandContracts,
  type BackendCommandKey,
  type BackendCommandResponse,
  type ParsedBackendCommandRequest,
} from "@shared/features/entrypoints/commands";
import type { IpcResult } from "@shared/ipc/result";
import { businessError, toIpcErrorPayload } from "@shared/ipc/result";
import { ZodError } from "zod";

interface EntrypointDispatcherServices {
  executeCommand: <TKey extends BackendCommandKey>(
    command: TKey,
    request: ParsedBackendCommandRequest<TKey>,
    signal?: AbortSignal,
  ) => Promise<BackendCommandResponse<TKey>>;
}

export function createEntrypointDispatcher(services: EntrypointDispatcherServices) {
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
