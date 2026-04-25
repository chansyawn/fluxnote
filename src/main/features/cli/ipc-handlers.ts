import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import { installCli, isCliInstalled, uninstallCli } from "./install-cli";

export function createCliCommandHandlers(): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "cliInstall",
      async handle() {
        await installCli();
        return undefined;
      },
    }),
    defineIpcCommandHandler({
      key: "cliUninstall",
      async handle() {
        await uninstallCli();
        return undefined;
      },
    }),
    defineIpcCommandHandler({
      key: "cliStatus",
      async handle() {
        return { installed: await isCliInstalled() };
      },
    }),
  ] as const;
}
