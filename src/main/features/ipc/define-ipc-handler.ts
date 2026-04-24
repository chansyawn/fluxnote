import type {
  IpcCommandContract,
  IpcCommandKey,
  IpcResponse,
  ParsedIpcRequest,
} from "@shared/ipc/contracts";
import { businessError, toIpcErrorPayload, type IpcResult } from "@shared/ipc/errors";
import type { IpcMainInvokeEvent, WebContents } from "electron";
import { ipcMain } from "electron";

interface DefineIpcHandlerOptions<TKey extends IpcCommandKey> {
  command: IpcCommandContract<TKey>;
  getTrustedWebContents: () => WebContents | null;
  handler: (
    request: ParsedIpcRequest<TKey>,
    event: IpcMainInvokeEvent,
  ) => Promise<IpcResponse<TKey>> | IpcResponse<TKey>;
}

const shouldValidateResponse = process.env.NODE_ENV !== "production";

function assertTrustedSender(
  event: IpcMainInvokeEvent,
  getTrustedWebContents: () => WebContents | null,
): void {
  const trustedWebContents = getTrustedWebContents();
  if (!trustedWebContents || event.sender !== trustedWebContents) {
    throw businessError("BUSINESS.INVALID_INVOKE", "Untrusted IPC sender");
  }
}

export function defineIpcHandler<TKey extends IpcCommandKey>(
  options: DefineIpcHandlerOptions<TKey>,
): void {
  ipcMain.handle(
    options.command.channel,
    async (event, payload: unknown): Promise<IpcResult<IpcResponse<TKey>>> => {
      try {
        assertTrustedSender(event, options.getTrustedWebContents);
        const request = options.command.request.parse(payload) as ParsedIpcRequest<TKey>;
        const response = await options.handler(request, event);
        const data = shouldValidateResponse
          ? (options.command.response.parse(response) as IpcResponse<TKey>)
          : response;
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
    },
  );
}
