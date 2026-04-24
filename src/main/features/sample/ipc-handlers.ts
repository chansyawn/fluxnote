import { businessError } from "@shared/ipc/errors";

import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";

export function createSampleCommandHandlers(): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
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
