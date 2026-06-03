import { appUpdateContract } from "@shared/features/app-update/contract";
import { assetsContract } from "@shared/features/assets/contract";
import { blocksContract } from "@shared/features/blocks/contract";
import { cliContract } from "@shared/features/cli/contract";
import { clipboardContract } from "@shared/features/clipboard/contract";
import { externalEditContract } from "@shared/features/external-edit/contract";
import { externalUrlContract } from "@shared/features/external-url/contract";
import { openBlockContract } from "@shared/features/open-block/contract";
import { preferencesContract } from "@shared/features/preferences/contract";
import { shortcutContract } from "@shared/features/shortcut/contract";
import { tagsContract } from "@shared/features/tags/contract";
import { telemetryContract } from "@shared/features/telemetry/contract";
import { windowContract } from "@shared/features/window/contract";
import type { z } from "zod";

export const contracts = {
  commands: {
    ...appUpdateContract.commands,
    ...assetsContract.commands,
    ...blocksContract.commands,
    ...clipboardContract.commands,
    ...cliContract.commands,
    ...externalEditContract.commands,
    ...externalUrlContract.commands,
    ...openBlockContract.commands,
    ...preferencesContract.commands,
    ...shortcutContract.commands,
    ...tagsContract.commands,
    ...telemetryContract.commands,
    ...windowContract.commands,
  },
  events: {
    ...appUpdateContract.events,
    ...blocksContract.events,
    ...clipboardContract.events,
    ...externalEditContract.events,
    ...externalUrlContract.events,
    ...openBlockContract.events,
    ...preferencesContract.events,
    ...shortcutContract.events,
    ...windowContract.events,
    ...telemetryContract.events,
  },
} as const;

export type CommandName = keyof typeof contracts.commands;
export type EventName = keyof typeof contracts.events;

export type CommandInput<T extends CommandName> = z.output<(typeof contracts.commands)[T]["input"]>;

export type CommandOutput<T extends CommandName> = z.infer<
  (typeof contracts.commands)[T]["output"]
>;

export type EventPayload<T extends EventName> = z.infer<(typeof contracts.events)[T]>;
