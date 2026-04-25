import { parseFluxArgs, FluxCliUsageError } from "@cli/flux-cli";
import { describe, expect, it } from "vite-plus/test";

const baseArgv = ["node", "flux"];

describe("flux cli parser", () => {
  it("parses app open command without input", () => {
    expect(parseFluxArgs(baseArgv)).toEqual({ kind: "open" });
  });

  it("parses inline text input", () => {
    expect(parseFluxArgs([...baseArgv, "--text", "hello world"])).toEqual({
      kind: "create",
      source: {
        text: "hello world",
        type: "text",
      },
    });
    expect(parseFluxArgs([...baseArgv, "--", "--text", "hello world"])).toEqual({
      kind: "create",
      source: {
        text: "hello world",
        type: "text",
      },
    });
  });

  it("parses file input from option and positional argument", () => {
    expect(parseFluxArgs([...baseArgv, "--file", "./input.md"])).toEqual({
      kind: "create",
      source: {
        filePath: "./input.md",
        type: "file",
      },
    });
    expect(parseFluxArgs([...baseArgv, "./input.md"])).toEqual({
      kind: "create",
      source: {
        filePath: "./input.md",
        type: "file",
      },
    });
  });

  it("rejects multiple input sources", () => {
    expect(() => parseFluxArgs([...baseArgv, "--text", "hello", "./input.md"])).toThrow(
      FluxCliUsageError,
    );
  });

  it("rejects unknown options", () => {
    expect(() => parseFluxArgs([...baseArgv, "--bad"])).toThrow(FluxCliUsageError);
  });
});
