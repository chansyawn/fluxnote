import { describe, expect, it } from "vitest";

import { FluxCliUsageError, parseFluxArgs } from "./args";

describe("parseFluxArgs", () => {
  it("returns open command when no input is provided", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs"]);
    expect(command).toEqual({ kind: "open" });
  });

  it("parses create command from text", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "--text", "hello"]);
    expect(command).toEqual({
      kind: "create",
      edit: false,
      source: {
        text: "hello",
        type: "text",
      },
    });
  });

  it("parses create command from file option", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "--file", "note.md"]);
    expect(command).toEqual({
      kind: "create",
      edit: false,
      source: {
        filePath: "note.md",
        type: "file",
      },
    });
  });

  it("parses create command from positional file path", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "note.md"]);
    expect(command).toEqual({
      kind: "create",
      edit: false,
      source: {
        filePath: "note.md",
        type: "file",
      },
    });
  });

  it("parses external edit command from positional file path", () => {
    const command = parseFluxArgs(["node", "flux-cli.mjs", "--edit", "note.md"]);
    expect(command).toEqual({
      kind: "create",
      edit: true,
      source: {
        filePath: "note.md",
        type: "file",
      },
    });
  });

  it("throws usage error when edit is used without file input", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "--edit"])).toThrow(FluxCliUsageError);
  });

  it("throws usage error when text is combined with edit", () => {
    expect(() => parseFluxArgs(["node", "flux-cli.mjs", "--text", "hello", "--edit"])).toThrowError(
      "--edit can only be used with --file or a file path.",
    );
  });

  it("throws usage error when multiple input sources are provided", () => {
    expect(() =>
      parseFluxArgs(["node", "flux-cli.mjs", "--text", "hello", "note.md"]),
    ).toThrowError("Use only one input source: --text, --file, or a file path.");
  });
});
