import { describe, expect, it } from "vite-plus/test";

import { FluxCliUsageError } from "./args";
import { getErrorMessage, resolveExitCode } from "./errors";

describe("errors", () => {
  it("returns message from Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns message from object payloads", () => {
    expect(getErrorMessage({ message: "payload message" })).toBe("payload message");
  });

  it("returns fallback message for unknown input", () => {
    expect(getErrorMessage(123)).toBe("Unknown CLI error.");
  });

  it("maps usage errors to exit code 2", () => {
    expect(resolveExitCode(new FluxCliUsageError("usage"))).toBe(2);
  });

  it("maps cac errors to exit code 2", () => {
    const error = new Error("invalid option");
    error.name = "CACError";
    expect(resolveExitCode(error)).toBe(2);
  });

  it("maps runtime errors to exit code 1", () => {
    expect(resolveExitCode(new Error("runtime"))).toBe(1);
  });
});
