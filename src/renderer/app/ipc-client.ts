import type { FluxnotesRuntime } from "@shared/electron-runtime";
import type {
  IpcCommandKey,
  IpcEventKey,
  IpcEventPayload,
  IpcRequest,
  IpcResponse,
} from "@shared/ipc/contracts";
import type { IpcErrorPayload } from "@shared/ipc/errors";
import type {
  FeatureApi,
  FeatureCommandInput,
  FeatureCommandOutput,
  FeatureEventPayload,
} from "@shared/ipc/feature-api";

export type RuntimeBridge = FluxnotesRuntime;
export type AppInvokeErrorPayload = IpcErrorPayload;

export type FeatureClient<TApi extends FeatureApi> = {
  commands: {
    readonly [TOperationName in keyof TApi["commands"]]: (
      request: FeatureCommandInput<TApi["commands"][TOperationName]>,
    ) => Promise<FeatureCommandOutput<TApi["commands"][TOperationName]>>;
  };
  events: {
    readonly [TEventName in keyof TApi["events"]]: {
      subscribe(
        handler: (payload: FeatureEventPayload<TApi["events"][TEventName]>) => void,
      ): () => void;
    };
  };
};

export class AppInvokeError extends Error {
  readonly type: string;
  readonly details?: unknown;

  constructor(payload: AppInvokeErrorPayload) {
    super(payload.message);
    this.name = "AppInvokeError";
    this.type = payload.type;
    this.details = payload.details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorPayload(value: unknown): value is AppInvokeErrorPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.type === "string" && typeof payload.message === "string";
}

export function toAppInvokeError(error: unknown): AppInvokeError {
  if (error instanceof AppInvokeError) {
    return error;
  }

  if (isErrorPayload(error)) {
    return new AppInvokeError({
      type: error.type,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof Error) {
    return new AppInvokeError({
      type: "INTERNAL",
      message: error.message,
    });
  }

  return new AppInvokeError({
    type: "INTERNAL",
    message: "Unknown invoke error",
    details: error,
  });
}

export function getRuntimeBridge(): RuntimeBridge {
  if (typeof window === "undefined") {
    throw new Error("Fluxnotes runtime bridge is unavailable: window is undefined");
  }

  const runtimeValue = window.fluxnotes;
  if (!isRecord(runtimeValue)) {
    throw new Error(
      "Fluxnotes runtime bridge is unavailable: window.fluxnotes is missing. Check preload bridge injection.",
    );
  }

  return runtimeValue as RuntimeBridge;
}

export async function invokeCommand<TKey extends IpcCommandKey>(
  key: TKey,
  payload: IpcRequest<TKey>,
): Promise<IpcResponse<TKey>> {
  try {
    return await getRuntimeBridge().invoke(key, payload);
  } catch (error) {
    throw toAppInvokeError(error);
  }
}

export function subscribeEvent<TKey extends IpcEventKey>(
  key: TKey,
  handler: (payload: IpcEventPayload<TKey>) => void,
): () => void {
  try {
    return getRuntimeBridge().subscribe(key, handler);
  } catch (error) {
    throw toAppInvokeError(error);
  }
}

export function createFeatureClient<TApi extends FeatureApi>(
  api: TApi,
  runtime?: RuntimeBridge,
): FeatureClient<TApi> {
  const commands = {} as FeatureClient<TApi>["commands"];
  for (const operation of Object.keys(api.commands) as Array<keyof TApi["commands"] & string>) {
    Object.assign(commands, {
      [operation]: async (request: unknown) => {
        const contract = api.commands[operation];
        const key = contract.key as IpcCommandKey;
        return await (runtime ?? getRuntimeBridge()).invoke(key, request as IpcRequest<typeof key>);
      },
    });
  }

  const events = {} as FeatureClient<TApi>["events"];
  for (const eventName of Object.keys(api.events) as Array<keyof TApi["events"] & string>) {
    Object.assign(events, {
      [eventName]: {
        subscribe(handler: (payload: unknown) => void) {
          const contract = api.events[eventName];
          const key = contract.key as IpcEventKey;
          return (runtime ?? getRuntimeBridge()).subscribe(
            key,
            handler as (payload: IpcEventPayload<typeof key>) => void,
          );
        },
      },
    });
  }

  return { commands, events };
}
