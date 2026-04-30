import type {
  FeatureApi,
  FeatureCommandContract,
  FeatureCommandOutput,
  ParsedFeatureCommandInput,
} from "@shared/ipc/feature-api";
import type { IpcMainInvokeEvent } from "electron";

export interface BackendCommandDefinition<TContract extends FeatureCommandContract> {
  contract: TContract;
  handle: (
    request: ParsedFeatureCommandInput<TContract>,
    event: IpcMainInvokeEvent,
  ) => Promise<FeatureCommandOutput<TContract>> | FeatureCommandOutput<TContract>;
}

export type AnyBackendCommandDefinition = BackendCommandDefinition<FeatureCommandContract>;

export interface BackendFeature {
  commands: readonly AnyBackendCommandDefinition[];
  name: string;
}

export type BackendCommandHandlers<TApi extends FeatureApi> = {
  readonly [TOperationName in keyof TApi["commands"]]: (
    request: ParsedFeatureCommandInput<TApi["commands"][TOperationName]>,
    event: IpcMainInvokeEvent,
  ) =>
    | Promise<FeatureCommandOutput<TApi["commands"][TOperationName]>>
    | FeatureCommandOutput<TApi["commands"][TOperationName]>;
};

interface DefineBackendFeatureOptions<TApi extends FeatureApi> {
  commands: BackendCommandHandlers<TApi>;
}

export function defineBackendFeature<TApi extends FeatureApi>(
  api: TApi,
  options: DefineBackendFeatureOptions<TApi>,
): BackendFeature {
  const commands = Object.keys(api.commands).map((operation) => {
    const commandName = operation as keyof TApi["commands"];
    const commandContracts = api.commands as TApi["commands"];
    return {
      contract: commandContracts[commandName],
      handle: options.commands[commandName],
    };
  });

  return {
    commands: commands as readonly AnyBackendCommandDefinition[],
    name: api.name,
  };
}
