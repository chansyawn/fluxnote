import { cac } from "cac";

export type FluxCliCommand =
  | {
      kind: "add";
      source:
        | {
            input: string;
            type: "auto";
          }
        | {
            filePath: string;
            type: "file";
          }
        | {
            text: string;
            type: "text";
          };
    }
  | {
      filePath: string;
      kind: "edit";
    }
  | {
      kind: "help";
    }
  | {
      kind: "open";
    };

interface FluxCliOptions {
  file?: unknown;
  help?: unknown;
  text?: unknown;
}

interface ParsedFluxArgs {
  args: readonly string[];
  commandName: string | null;
  options: FluxCliOptions & Record<string, unknown>;
}

export class FluxCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FluxCliUsageError";
  }
}

function createCli() {
  const cli = cac("flux").usage("[command]").help();

  cli
    .command("add [input]", "Create a block from text or a UTF-8 text file")
    .usage("[--text <text> | --file <path> | <input>]")
    .option("--text <text>", "Create a block with inline text")
    .option("--file <path>", "Create a block from a UTF-8 text file");

  cli.command("edit <file>", "Edit a file-backed block and wait for submit or cancel");

  return cli;
}

function normalizeArgv(argv: readonly string[]): string[] {
  const normalizedArgv = [...argv];
  if (normalizedArgv[2] === "--") {
    normalizedArgv.splice(2, 1);
  }
  return normalizedArgv;
}

function getCommandName(argv: readonly string[]): string | null {
  const commandName = argv[2];
  if (commandName === undefined || commandName.startsWith("-")) {
    return null;
  }

  return commandName;
}

function parseArgv(argv: readonly string[]): ParsedFluxArgs {
  const normalizedArgv = normalizeArgv(argv);
  const parsed = createCli().parse(normalizedArgv, { run: false });
  return {
    args: parsed.args,
    commandName: getCommandName(normalizedArgv),
    options: parsed.options as FluxCliOptions & Record<string, unknown>,
  };
}

function getStringOption(value: unknown, flag: string): string | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new FluxCliUsageError(`${flag} requires a value.`);
  }

  return value;
}

function findUnknownOptions(options: Record<string, unknown>): string[] {
  const allowedOptions = new Set(["--", "file", "help", "text"]);
  return Object.keys(options).filter((key) => !allowedOptions.has(key));
}

function assertKnownOptions(options: Record<string, unknown>): void {
  const unknownOptions = findUnknownOptions(options);
  if (unknownOptions.length > 0) {
    throw new FluxCliUsageError(`Unknown option: --${unknownOptions[0]}`);
  }
}

function parseAddCommand(args: readonly string[], options: FluxCliOptions): FluxCliCommand {
  const text = getStringOption(options.text, "--text");
  const file = getStringOption(options.file, "--file");
  const selectedInputCount = (text === null ? 0 : 1) + (file === null ? 0 : 1) + args.length;

  if (selectedInputCount === 0) {
    throw new FluxCliUsageError("flux add requires text or a file path.");
  }

  if (selectedInputCount > 1) {
    throw new FluxCliUsageError("Use only one input source: --text, --file, or an input value.");
  }

  if (text !== null) {
    return {
      kind: "add",
      source: {
        text,
        type: "text",
      },
    };
  }

  if (file !== null) {
    return {
      kind: "add",
      source: {
        filePath: file,
        type: "file",
      },
    };
  }

  return {
    kind: "add",
    source: {
      input: args[0],
      type: "auto",
    },
  };
}

function parseEditCommand(args: readonly string[], options: FluxCliOptions): FluxCliCommand {
  const text = getStringOption(options.text, "--text");
  const file = getStringOption(options.file, "--file");
  const selectedInputCount = (text === null ? 0 : 1) + (file === null ? 0 : 1) + args.length;

  if (text !== null || file !== null) {
    throw new FluxCliUsageError("flux edit only accepts a file path argument.");
  }

  if (selectedInputCount === 0) {
    throw new FluxCliUsageError("flux edit requires a file path.");
  }

  if (selectedInputCount > 1) {
    throw new FluxCliUsageError("flux edit only accepts one file path.");
  }

  return {
    filePath: args[0],
    kind: "edit",
  };
}

function parseRootCommand(
  commandName: string | null,
  args: readonly string[],
  options: FluxCliOptions,
): FluxCliCommand {
  if (options.file !== undefined || options.text !== undefined) {
    throw new FluxCliUsageError("Use `flux add` to create a block or `flux edit` to edit a file.");
  }

  if (commandName === null && args.length === 0) {
    return { kind: "open" };
  }

  if (commandName === "new") {
    throw new FluxCliUsageError("Use `flux add` instead of `flux new`.");
  }

  throw new FluxCliUsageError("Use `flux add` to create a block or `flux edit` to edit a file.");
}

export function parseFluxArgs(argv: readonly string[]): FluxCliCommand {
  const { args, commandName, options } = parseArgv(argv);

  if (options.help) {
    return { kind: "help" };
  }

  assertKnownOptions(options);

  if (commandName === "add") {
    return parseAddCommand(args, options);
  }

  if (commandName === "edit") {
    return parseEditCommand(args, options);
  }

  return parseRootCommand(commandName, args, options);
}
