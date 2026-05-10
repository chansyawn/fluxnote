import { describe, expect, it } from "vitest";

import { FluxCliUsageError, parseFluxArgs } from "./args";

describe("parseFluxArgs", () => {
  it("returns open command when no command is provided", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs"]);
    expect(command).toEqual({ kind: "open" });
  });

  it("parses add command from auto input", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "add", "hello"]);
    expect(command).toEqual({
      kind: "add",
      source: {
        input: "hello",
        type: "auto",
      },
    });
  });

  it("parses add command from text option", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "add", "--text", "hello"]);
    expect(command).toEqual({
      kind: "add",
      source: {
        text: "hello",
        type: "text",
      },
    });
  });

  it("parses add command from file option", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "add", "--file", "note.md"]);
    expect(command).toEqual({
      kind: "add",
      source: {
        filePath: "note.md",
        type: "file",
      },
    });
  });

  it("parses edit command from file path", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "edit", "note.md"]);
    expect(command).toEqual({
      filePath: "note.md",
      kind: "edit",
    });
  });

  it("returns help command for root help", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "--help"]);
    expect(command).toEqual({ kind: "help" });
  });

  it("returns help command for add help", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "add", "--help"]);
    expect(command).toEqual({ kind: "help" });
  });

  it("throws usage error when add has no input", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "add"])).toThrow(FluxCliUsageError);
  });

  it("throws usage error when add has multiple input sources", () => {
    expect(() =>
      parseFluxArgs(["node", "flux-cli.mjs", "add", "--text", "hello", "note.md"]),
    ).toThrow("Use only one input source: --text, --file, or an input value.");
  });

  it("throws usage error when edit has no file path", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "edit"])).toThrow(
      "flux edit requires a file path.",
    );
  });

  it("throws usage error when edit has multiple file paths", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "edit", "a.md", "b.md"])).toThrow(
      "flux edit only accepts one file path.",
    );
  });

  it("throws usage error when edit receives a typed source option", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "edit", "--file", "note.md"])).toThrow(
      "flux edit only accepts a file path argument.",
    );
  });

  it("throws usage error for removed new command", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "new", "hello"])).toThrow(
      "Use `flux add` instead of `flux new`.",
    );
  });

  it("throws usage error for removed root text option", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "--text", "hello"])).toThrow(
      "Use `flux add` to create a block or `flux edit` to edit a file.",
    );
  });

  it("throws usage error for removed root edit option", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "--edit", "note.md"])).toThrow(
      "Unknown option: --edit",
    );
  });

  it("throws usage error for removed root positional input", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "note.md"])).toThrow(
      "Use `flux add` to create a block or `flux edit` to edit a file.",
    );
  });
});
