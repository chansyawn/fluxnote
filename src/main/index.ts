/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import path from "node:path";

import { app } from "electron";

import { startPrimaryInstance } from "./app/bootstrap";

const DEEP_LINK_PROTOCOL = "fluxnote";

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

registerDefaultProtocolClient();

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  startPrimaryInstance();
}
