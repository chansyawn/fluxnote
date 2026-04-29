/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { app } from "electron";

import { startPrimaryInstance } from "./app/bootstrap";

const DEEP_LINK_PROTOCOL = "fluxnote";
const USER_DATA_DIR_NAME = ".flux";

function configureUserDataPath(): void {
  const defaultSessionDataPath = app.getPath("sessionData");
  const defaultLogsPath = app.getPath("logs");
  const userDataPath = path.join(os.homedir(), USER_DATA_DIR_NAME);
  app.setPath("userData", userDataPath);
  app.setPath("sessionData", defaultSessionDataPath);
  app.setPath("logs", defaultLogsPath);
  fs.mkdirSync(userDataPath, { recursive: true });
}

function registerDefaultProtocolClient(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
    return;
  }

  app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);
}

configureUserDataPath();
registerDefaultProtocolClient();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  startPrimaryInstance();
}
