import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createEntrypointEnvelope, createEntrypointEnvelopeSchema } from "./envelope";

describe("entrypoints envelope", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("should validate envelope schema", () => {
    const schema = createEntrypointEnvelopeSchema(z.literal("app.open"));

    expect(
      schema.safeParse({
        id: "id-1",
        kind: "command",
        command: "app.open",
        payload: null,
        meta: { source: "cli", timestamp: 1 },
      }).success,
    ).toBe(true);

    expect(
      schema.safeParse({
        id: "",
        kind: "event",
        command: "app.open",
        payload: null,
        meta: { source: "unknown" },
      }).success,
    ).toBe(false);
  });

  it("should create envelope with generated id and default timestamp", () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "uuid-1") });
    vi.spyOn(Date, "now").mockReturnValue(123456);

    const envelope = createEntrypointEnvelope({
      command: "app.open",
      payload: { ok: true },
      source: "deep-link",
    });

    expect(envelope).toEqual({
      id: "uuid-1",
      kind: "command",
      command: "app.open",
      payload: { ok: true },
      meta: {
        source: "deep-link",
        timestamp: 123456,
      },
    });
  });

  it("should keep provided timestamp", () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "uuid-2") });
    vi.spyOn(Date, "now").mockReturnValue(99999);

    const envelope = createEntrypointEnvelope({
      command: "block.open",
      payload: { blockId: "b1" },
      source: "cli",
      timestamp: 100,
    });

    expect(envelope.meta.timestamp).toBe(100);
  });
});
