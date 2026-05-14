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
      tagNames: [],
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
      tagNames: [],
    });
  });

  it("parses add command from short text option", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "add", "-x", "hello"]);
    expect(command).toEqual({
      kind: "add",
      source: {
        text: "hello",
        type: "text",
      },
      tagNames: [],
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
      tagNames: [],
    });
  });

  it("parses add command from short file option", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "add", "-f", "note.md"]);
    expect(command).toEqual({
      kind: "add",
      source: {
        filePath: "note.md",
        type: "file",
      },
      tagNames: [],
    });
  });

  it("parses add command with repeated tag options", () => {
    const command = parseFluxArgs([
      "node",
      "flux-cli.mjs",
      "add",
      "hello",
      "--tag",
      "work",
      "--tag",
      " idea ",
    ]);
    expect(command).toEqual({
      kind: "add",
      source: {
        input: "hello",
        type: "auto",
      },
      tagNames: ["work", "idea"],
    });
  });

  it("parses add command with repeated short tag options", () => {
    const command = parseFluxArgs([
      "node",
      "flux-cli.mjs",
      "add",
      "hello",
      "-t",
      "work",
      "-t",
      " idea ",
    ]);
    expect(command).toEqual({
      kind: "add",
      source: {
        input: "hello",
        type: "auto",
      },
      tagNames: ["work", "idea"],
    });
  });

  it("parses edit command from file path", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "edit", "note.md"]);
    expect(command).toEqual({
      filePath: "note.md",
      kind: "edit",
      tagNames: [],
    });
  });

  it("parses edit command with repeated tag options", () => {
    const command = parseFluxArgs([
      "node",
      "flux-cli.mjs",
      "edit",
      "note.md",
      "--tag",
      "work",
      "--tag",
      "draft",
    ]);
    expect(command).toEqual({
      filePath: "note.md",
      kind: "edit",
      tagNames: ["work", "draft"],
    });
  });

  it("parses edit command with repeated short tag options", () => {
    const command = parseFluxArgs([
      "node",
      "flux-cli.mjs",
      "edit",
      "note.md",
      "-t",
      "work",
      "-t",
      "draft",
    ]);
    expect(command).toEqual({
      filePath: "note.md",
      kind: "edit",
      tagNames: ["work", "draft"],
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
});
