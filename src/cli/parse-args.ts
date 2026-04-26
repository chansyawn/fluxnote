import { cac } from "cac";

export type FluxCliCommand =
  | {
      kind: "create";
      source:
        | {
            edit: false;
            text: string;
            type: "text";
          }
        | {
            edit: boolean;
            filePath: string;
            type: "file";
          };
    }
  | {
      kind: "help";
    }
  | {
      kind: "open";
    };

interface FluxCliOptions {
  edit?: unknown;
  file?: unknown;
  help?: unknown;
  text?: unknown;
}

export class FluxCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FluxCliUsageError";
  }
}

function createCli() {
  return cac("flux")
    .usage("[--text <text> | --file <path> | <path>] [--edit]")
    .option("--edit", "Edit a file-backed block and wait for submit or cancel")
    .option("--text <text>", "Create a block with inline text")
    .option("--file <path>", "Create a block from a UTF-8 text file")
    .help();
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
  const allowedOptions = new Set(["--", "edit", "file", "help", "text"]);
  return Object.keys(options).filter((key) => !allowedOptions.has(key));
}

export function parseFluxArgs(argv: readonly string[]): FluxCliCommand {
  const cli = createCli();
  const normalizedArgv = [...argv];
  if (normalizedArgv[2] === "--") {
    normalizedArgv.splice(2, 1);
  }
  const parsed = cli.parse(normalizedArgv, { run: false });
  const options = parsed.options as FluxCliOptions & Record<string, unknown>;

  if (options.help) {
    return { kind: "help" };
  }

  const unknownOptions = findUnknownOptions(options);
  if (unknownOptions.length > 0) {
    throw new FluxCliUsageError(`Unknown option: --${unknownOptions[0]}`);
  }

  const text = getStringOption(options.text, "--text");
  const file = getStringOption(options.file, "--file");
  const edit = Boolean(options.edit);
  const positionalFiles = parsed.args;
  const selectedInputCount =
    (text === null ? 0 : 1) + (file === null ? 0 : 1) + positionalFiles.length;

  if (selectedInputCount === 0) {
    if (edit) {
      throw new FluxCliUsageError("--edit requires a file path.");
    }

    return { kind: "open" };
  }

  if (selectedInputCount > 1) {
    throw new FluxCliUsageError("Use only one input source: --text, --file, or a file path.");
  }

  if (text !== null) {
    if (edit) {
      throw new FluxCliUsageError("--edit can only be used with --file or a file path.");
    }

    return {
      kind: "create",
      source: {
        edit: false,
        text,
        type: "text",
      },
    };
  }

  return {
    kind: "create",
    source: {
      edit,
      filePath: file ?? positionalFiles[0],
      type: "file",
    },
  };
}
