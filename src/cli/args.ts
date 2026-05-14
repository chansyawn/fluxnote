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
      tagNames: string[];
    }
  | {
      filePath: string;
      kind: "edit";
      tagNames: string[];
    }
  | {
      kind: "help";
    }
  | {
      kind: "open";
    };

interface FluxCliOptions {
  file?: string;
  tag?: string | string[];
  text?: string;
}

export class FluxCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FluxCliUsageError";
  }
}

function hasValue(value: string | undefined): value is string {
  return value !== undefined;
}

function parseTagNames(value: FluxCliOptions["tag"]): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values.map((tagName) => tagName.trim()).filter((tagName) => tagName.length > 0);
}

function parseAddCommand(input: string | undefined, options: FluxCliOptions): FluxCliCommand {
  const sources = [options.text, options.file, input].filter(hasValue);
  const tagNames = parseTagNames(options.tag);

  if (sources.length === 0) {
    throw new FluxCliUsageError("flux add requires text or a file path.");
  }

  if (sources.length > 1) {
    throw new FluxCliUsageError("Use only one input source: --text, --file, or an input value.");
  }

  if (options.text !== undefined) {
    return {
      kind: "add",
      source: {
        text: options.text,
        type: "text",
      },
      tagNames,
    };
  }

  if (options.file !== undefined) {
    return {
      kind: "add",
      source: {
        filePath: options.file,
        type: "file",
      },
      tagNames,
    };
  }

  return {
    kind: "add",
    source: {
      input: sources[0],
      type: "auto",
    },
    tagNames,
  };
}

function createCli(onCommand: (command: FluxCliCommand) => void) {
  const cli = cac("flux").usage("[command]").help();

  cli
    .command("add [input]", "Create a block from text or a UTF-8 text file")
    .usage("[--text <text> | --file <path> | <input>]")
    .option("--text <text>", "Create a block with inline text")
    .option("--file <path>", "Create a block from a UTF-8 text file")
    .option("--tag <name>", "Add a tag to the created block")
    .action((input: string | undefined, options: FluxCliOptions) => {
      onCommand(parseAddCommand(input, options));
    });

  cli
    .command("edit <file>", "Edit a file-backed block and wait for submit or cancel")
    .option("--tag <name>", "Add a tag to the created block")
    .action((filePath: string, options: FluxCliOptions) => {
      onCommand({ filePath, kind: "edit", tagNames: parseTagNames(options.tag) });
    });

  cli.command("").action(() => {
    onCommand({ kind: "open" });
  });

  return cli;
}

function normalizeArgv(argv: readonly string[]): string[] {
  const normalizedArgv = [...argv];
  if (normalizedArgv[2] === "--") {
    normalizedArgv.splice(2, 1);
  }
  return normalizedArgv;
}

export function parseFluxArgs(argv: readonly string[]): FluxCliCommand {
  let command: FluxCliCommand | null = null;
  const cli = createCli((parsedCommand) => {
    command = parsedCommand;
  });
  const normalizedArgv = normalizeArgv(argv);

  cli.parse(normalizedArgv);

  if (command !== null) {
    return command;
  }

  if (cli.options.help) {
    return { kind: "help" };
  }

  throw new FluxCliUsageError("Use `flux add` to create a block or `flux edit` to edit a file.");
}
