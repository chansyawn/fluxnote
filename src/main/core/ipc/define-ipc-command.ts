import { businessError, toIpcErrorPayload, type IpcResult } from "@shared/ipc/errors";
import type {
  FeatureCommandContract,
  FeatureCommandOutput,
  ParsedFeatureCommandInput,
} from "@shared/ipc/feature-api";
import type { IpcMainInvokeEvent, WebContents } from "electron";
import { ipcMain } from "electron";

interface DefineIpcCommandOptions<TContract extends FeatureCommandContract> {
  command: TContract;
  getTrustedWebContents: () => WebContents | null;
  run: (
    request: ParsedFeatureCommandInput<TContract>,
    event: IpcMainInvokeEvent,
  ) => Promise<FeatureCommandOutput<TContract>> | FeatureCommandOutput<TContract>;
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

export function defineIpcCommand<TContract extends FeatureCommandContract>(
  options: DefineIpcCommandOptions<TContract>,
): void {
  ipcMain.handle(
    options.command.channel,
    async (event, payload: unknown): Promise<IpcResult<FeatureCommandOutput<TContract>>> => {
      try {
        assertTrustedSender(event, options.getTrustedWebContents);
        const request = options.command.request.parse(
          payload,
        ) as ParsedFeatureCommandInput<TContract>;
        const response = await options.run(request, event);
        const data = shouldValidateResponse
          ? (options.command.response.parse(response) as FeatureCommandOutput<TContract>)
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
