import type { AppEnvironment } from "@shared/app/platform";
import type {
  CommandInput,
  CommandName,
  CommandOutput,
  EventName,
  EventPayload,
} from "@shared/ipc/types";

declare global {
  interface Window {
    appEnvironment: AppEnvironment;
    ipc: {
      command<T extends CommandName>(name: T, input: CommandInput<T>): Promise<CommandOutput<T>>;
      on<T extends EventName>(name: T, listener: (payload: EventPayload<T>) => void): () => void;
    };
  }
}

export {};
