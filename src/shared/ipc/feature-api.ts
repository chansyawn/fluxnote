import type { z } from "zod";

export type IpcSchema = z.ZodType;

export interface FeatureCommandDefinition<
  TRequest extends IpcSchema = IpcSchema,
  TResponse extends IpcSchema = IpcSchema,
> {
  request: TRequest;
  response: TResponse;
}

export interface FeatureEventDefinition<TPayload extends IpcSchema = IpcSchema> {
  payload: TPayload;
}

export type FeatureCommandDefinitions = Record<string, FeatureCommandDefinition>;
export type FeatureEventDefinitions = Record<string, FeatureEventDefinition>;

export type FeatureCommandContract<
  TFeatureName extends string = string,
  TOperationName extends string = string,
  TDefinition extends FeatureCommandDefinition = FeatureCommandDefinition,
> = TDefinition & {
  channel: `fluxnotes:${TFeatureName}:command:${TOperationName}`;
  feature: TFeatureName;
  key: `${TFeatureName}.${TOperationName}`;
  operation: TOperationName;
};

export type FeatureEventContract<
  TFeatureName extends string = string,
  TEventName extends string = string,
  TDefinition extends FeatureEventDefinition = FeatureEventDefinition,
> = TDefinition & {
  channel: `fluxnotes:${TFeatureName}:event:${TEventName}`;
  event: TEventName;
  feature: TFeatureName;
  key: `${TFeatureName}.${TEventName}`;
};

export type FeatureCommandContracts<
  TFeatureName extends string,
  TDefinitions extends FeatureCommandDefinitions,
> = {
  readonly [TOperationName in keyof TDefinitions & string]: FeatureCommandContract<
    TFeatureName,
    TOperationName,
    TDefinitions[TOperationName]
  >;
};

export type FeatureEventContracts<
  TFeatureName extends string,
  TDefinitions extends FeatureEventDefinitions,
> = {
  readonly [TEventName in keyof TDefinitions & string]: FeatureEventContract<
    TFeatureName,
    TEventName,
    TDefinitions[TEventName]
  >;
};

export interface FeatureApi<
  TName extends string = string,
  TCommands extends FeatureCommandDefinitions = FeatureCommandDefinitions,
  TEvents extends FeatureEventDefinitions = FeatureEventDefinitions,
> {
  commands: FeatureCommandContracts<TName, TCommands>;
  events: FeatureEventContracts<TName, TEvents>;
  name: TName;
}

interface DefineFeatureApiOptions<
  TName extends string,
  TCommands extends FeatureCommandDefinitions,
  TEvents extends FeatureEventDefinitions,
> {
  commands: TCommands;
  events?: TEvents;
  name: TName;
}

export function command<TRequest extends IpcSchema, TResponse extends IpcSchema>(
  definition: FeatureCommandDefinition<TRequest, TResponse>,
): FeatureCommandDefinition<TRequest, TResponse> {
  return definition;
}

export function event<TPayload extends IpcSchema>(
  definition: FeatureEventDefinition<TPayload>,
): FeatureEventDefinition<TPayload> {
  return definition;
}

export function defineFeatureApi<
  const TName extends string,
  const TCommands extends FeatureCommandDefinitions,
  const TEvents extends FeatureEventDefinitions = Record<string, never>,
>(
  options: DefineFeatureApiOptions<TName, TCommands, TEvents>,
): FeatureApi<TName, TCommands, TEvents> {
  const commands = {} as FeatureCommandContracts<TName, TCommands>;
  for (const operation of Object.keys(options.commands) as Array<keyof TCommands & string>) {
    const definition = options.commands[operation];
    Object.assign(commands, {
      [operation]: {
        ...definition,
        channel: `fluxnotes:${options.name}:command:${operation}`,
        feature: options.name,
        key: `${options.name}.${operation}`,
        operation,
      },
    });
  }

  const eventDefinitions = options.events ?? ({} as TEvents);
  const events = {} as FeatureEventContracts<TName, TEvents>;
  for (const eventName of Object.keys(eventDefinitions) as Array<keyof TEvents & string>) {
    const definition = eventDefinitions[eventName];
    Object.assign(events, {
      [eventName]: {
        ...definition,
        channel: `fluxnotes:${options.name}:event:${eventName}`,
        event: eventName,
        feature: options.name,
        key: `${options.name}.${eventName}`,
      },
    });
  }

  return {
    commands,
    events,
    name: options.name,
  };
}

export type FeatureCommandInput<TContract extends FeatureCommandContract> = z.input<
  TContract["request"]
>;
export type ParsedFeatureCommandInput<TContract extends FeatureCommandContract> = z.infer<
  TContract["request"]
>;
export type FeatureCommandOutput<TContract extends FeatureCommandContract> = z.infer<
  TContract["response"]
>;
export type FeatureEventPayload<TContract extends FeatureEventContract> = z.infer<
  TContract["payload"]
>;
