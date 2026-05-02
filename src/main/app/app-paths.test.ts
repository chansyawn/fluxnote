import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appGetPath: vi.fn((name: string) =>
    name === "sessionData" ? "/default/session" : "/default/logs",
  ),
  homedir: vi.fn(() => "/home/tester"),
  mkdirSync: vi.fn(),
  setPath: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {
    mkdirSync: mocks.mkdirSync,
  },
}));

vi.mock("node:os", () => ({
  default: {
    homedir: mocks.homedir,
  },
}));

vi.mock("electron", () => ({
  app: {
    getPath: mocks.appGetPath,
    setPath: mocks.setPath,
  },
}));

import { APP_USER_DATA_DIR_NAME } from "@shared/app/app-config";

import { configureUserDataPath } from "./app-paths";

describe("configureUserDataPath", () => {
  it("sets app paths and creates userData directory", () => {
    configureUserDataPath();

    expect(mocks.setPath).toHaveBeenCalledWith(
      "userData",
      `/home/tester/${APP_USER_DATA_DIR_NAME}`,
    );
    expect(mocks.setPath).toHaveBeenCalledWith("sessionData", "/default/session");
    expect(mocks.setPath).toHaveBeenCalledWith("logs", "/default/logs");
    expect(mocks.mkdirSync).toHaveBeenCalledWith(`/home/tester/${APP_USER_DATA_DIR_NAME}`, {
      recursive: true,
    });
  });
});
