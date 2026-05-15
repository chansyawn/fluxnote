import type {
  BackendCommandKey,
  BackendCommandResponse,
} from "@shared/features/entrypoints/commands";

import { launchAppAndWaitForServer } from "./app-launcher";
import { isConnectionError, sendCommand } from "./transport";

export async function dispatchCommand<TKey extends BackendCommandKey>(
  command: TKey,
  payload: unknown,
): Promise<BackendCommandResponse<TKey>> {
  try {
    return await sendCommand(command, payload);
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }
  }

  await launchAppAndWaitForServer();
  return await sendCommand(command, payload);
}
