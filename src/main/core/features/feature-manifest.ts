import type { AnyIpcCommandDefinition } from "../ipc/ipc-command-definition";

export interface BackendFeatureManifest {
  ipcCommands?: readonly AnyIpcCommandDefinition[];
  name: string;
}
