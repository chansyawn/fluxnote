import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";
import { businessError } from "@shared/ipc/errors";

export function createSampleIpcCommands(): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "sampleGreet",
      async handle(request) {
        if (request.name.toLowerCase() === "missing") {
          throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${request.name}`);
        }

        return {
          message: `Hello, ${request.name}! This message is from the Electron backend.`,
        };
      },
    }),
  ] as const;
}
