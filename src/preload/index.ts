import { normalizeAppPlatform, type AppEnvironment } from "@shared/app/platform";
import type { IpcResult } from "@shared/ipc/result";
import type {
  CommandInput,
  CommandName,
  CommandOutput,
  EventName,
  EventPayload,
} from "@shared/ipc/types";
import { contextBridge, ipcRenderer } from "electron";

async function invokeCommand<T extends CommandName>(
  name: T,
  input: CommandInput<T>,
): Promise<CommandOutput<T>> {
  const result = (await ipcRenderer.invoke(name, input)) as IpcResult<CommandOutput<T>>;

  if (!result.ok) {
    throw result.error;
  }

  return result.data;
}

const ipc = {
  async command<T extends CommandName>(name: T, input: CommandInput<T>): Promise<CommandOutput<T>> {
    return await invokeCommand(name, input);
  },

  on<T extends EventName>(name: T, listener: (payload: EventPayload<T>) => void): () => void {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: EventPayload<T>) => {
      listener(payload);
    };

    ipcRenderer.on(name, wrapped);

    return () => {
      ipcRenderer.removeListener(name, wrapped);
    };
  },
};

const appEnvironment: AppEnvironment = {
  platform: normalizeAppPlatform(process.platform),
};

contextBridge.exposeInMainWorld("ipc", ipc);
contextBridge.exposeInMainWorld("appEnvironment", appEnvironment);
