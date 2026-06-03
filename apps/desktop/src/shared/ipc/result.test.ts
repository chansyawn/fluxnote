import { describe, expect, it } from "vite-plus/test";

import { IpcAppError, businessError, internalError, toIpcErrorPayload } from "./result";

describe("ipc result", () => {
  it("should create business error", () => {
    const error = businessError("BUSINESS.NOT_FOUND", "not found", { id: "1" });

    expect(error).toBeInstanceOf(IpcAppError);
    expect(error.code).toBe("BUSINESS.NOT_FOUND");
    expect(error.message).toBe("not found");
    expect(error.details).toEqual({ id: "1" });
  });

  it("should create internal error", () => {
    const error = internalError("internal", { reason: "db" });

    expect(error).toBeInstanceOf(IpcAppError);
    expect(error.code).toBe("INTERNAL");
    expect(error.message).toBe("internal");
    expect(error.details).toEqual({ reason: "db" });
  });

  it("should convert IpcAppError payload", () => {
    const error = businessError("BUSINESS.INVALID_INVOKE", "invalid", { field: "id" });

    expect(toIpcErrorPayload(error)).toEqual({
      code: "BUSINESS.INVALID_INVOKE",
      message: "invalid",
      details: { field: "id" },
    });
  });

  it("should convert plain payload object", () => {
    expect(toIpcErrorPayload({ code: "INTERNAL", message: "m", details: 1 })).toEqual({
      code: "INTERNAL",
      message: "m",
      details: 1,
    });
  });

  it("should convert generic error to internal payload", () => {
    const error = new TypeError("boom");
    const payload = toIpcErrorPayload(error);

    expect(payload.code).toBe("INTERNAL");
    expect(payload.message).toBe("boom");
    expect(payload.details).toMatchObject({
      name: "TypeError",
    });
  });

  it("should convert unknown value to internal payload", () => {
    expect(toIpcErrorPayload("raw-error")).toEqual({
      code: "INTERNAL",
      message: "Unknown IPC error",
      details: "raw-error",
    });
  });
});
