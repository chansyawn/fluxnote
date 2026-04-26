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
    expect(ipcCommandContracts.blocksList.request.parse({})).toEqual({
      limit: 50,
      offset: 0,
      visibility: "active",
    });
    expect(ipcCommandContracts.blocksList.request.parse({ limit: 200, offset: 10 })).toEqual({
      limit: 200,
      offset: 10,
      visibility: "active",
    });
    expect(() => ipcCommandContracts.blocksList.request.parse({ limit: 201 })).toThrow();
    expect(ipcCommandContracts.openBlockPendingRead.response.parse({ blockId: null })).toEqual({
      blockId: null,
    });
    expect(
      ipcCommandContracts.openBlockPendingAcknowledge.request.parse({ blockId: "block-1" }),
    ).toEqual({
      blockId: "block-1",
    });
  });

  it("validates event payload schemas", () => {
    expect(
      ipcEventContracts.autoArchiveStateChanged.payload.parse({
        archivedCount: 1,
        pendingCount: 2,
        windowVisible: true,
      }),
    ).toEqual({
      archivedCount: 1,
      pendingCount: 2,
      windowVisible: true,
    });
    expect(() => ipcEventContracts.openBlockRequested.payload.parse({})).toThrow();
  });
});
