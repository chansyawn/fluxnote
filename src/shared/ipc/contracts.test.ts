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
      visibility: "active",
    });
    expect(ipcCommandContracts.deepLinkPendingRead.response.parse({ blockId: null })).toEqual({
      blockId: null,
    });
    expect(
      ipcCommandContracts.deepLinkPendingAcknowledge.request.parse({ blockId: "block-1" }),
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
    expect(() => ipcEventContracts.deepLinkOpenBlock.payload.parse({})).toThrow();
  });
});
