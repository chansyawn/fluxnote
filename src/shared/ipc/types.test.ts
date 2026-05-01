import { DEFAULT_SETTINGS } from "@shared/features/preferences";
import { contracts } from "@shared/ipc/types";
import { describe, expect, it } from "vite-plus/test";

describe("ipc contracts", () => {
  it("parses command requests and responses with shared schemas", () => {
    expect(contracts.commands["blocks.list"].input.parse({})).toEqual({
      limit: 50,
      offset: 0,
      tagIds: undefined,
      visibility: "active",
    });
    expect(() => contracts.commands["blocks.list"].input.parse({ limit: 201 })).toThrow();
    expect(contracts.commands["preferences.read"].output.parse(DEFAULT_SETTINGS)).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("parses event payloads", () => {
    expect(
      contracts.events["blocks.autoArchiveStateChanged"].parse({
        archivedCount: 1,
        pendingCount: 2,
        windowVisible: false,
      }),
    ).toEqual({ archivedCount: 1, pendingCount: 2, windowVisible: false });

    expect(() => contracts.events["openBlock.requested"].parse({})).toThrow();
  });
});
