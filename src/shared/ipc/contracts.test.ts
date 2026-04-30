import { DEFAULT_SETTINGS } from "@shared/features/preferences";
import {
  ipcCommandContracts,
  ipcCommandKeys,
  ipcEventContracts,
  ipcEventKeys,
} from "@shared/ipc/contracts";
import { describe, expect, it } from "vite-plus/test";

describe("ipc contracts", () => {
  it("exposes key lists aligned with the contract registries", () => {
    expect(ipcCommandKeys).toEqual(Object.keys(ipcCommandContracts));
    expect(ipcEventKeys).toEqual(Object.keys(ipcEventContracts));
  });

  it("parses defaulted command inputs", () => {
    expect(ipcCommandContracts["blocks.list"].request.parse({})).toEqual({
      limit: 50,
      offset: 0,
      visibility: "active",
    });
    expect(ipcCommandContracts["blocks.list"].request.parse({ limit: 200, offset: 10 })).toEqual({
      limit: 200,
      offset: 10,
      visibility: "active",
    });
    expect(() => ipcCommandContracts["blocks.list"].request.parse({ limit: 201 })).toThrow();
    expect(ipcCommandContracts["openBlock.readPending"].response.parse({ blockId: null })).toEqual({
      blockId: null,
    });
    expect(
      ipcCommandContracts["openBlock.acknowledgePending"].request.parse({ blockId: "block-1" }),
    ).toEqual({
      blockId: "block-1",
    });
    expect(ipcCommandContracts["preferences.read"].response.parse(DEFAULT_SETTINGS)).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(
      ipcCommandContracts["preferences.patch"].request.parse({
        appearance: {
          fontSize: 20,
        },
      }),
    ).toEqual({
      appearance: {
        fontSize: 20,
      },
    });
    expect(ipcCommandContracts["preferences.reset"].response.parse(DEFAULT_SETTINGS)).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(() =>
      ipcCommandContracts["preferences.patch"].request.parse({
        appearance: {
          fontSize: 21,
        },
      }),
    ).toThrow();
  });

  it("validates event payload schemas", () => {
    expect(
      ipcEventContracts["blocks.autoArchiveStateChanged"].payload.parse({
        archivedCount: 1,
        pendingCount: 2,
        windowVisible: true,
      }),
    ).toEqual({
      archivedCount: 1,
      pendingCount: 2,
      windowVisible: true,
    });
    expect(() => ipcEventContracts["openBlock.requested"].payload.parse({})).toThrow();
  });
});
