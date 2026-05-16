/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import path from "node:path";

import { APP_PROTOCOL } from "@shared/app/app-config";
import { app } from "electron";

import { configureUserDataPath } from "./app/app-paths";
import { startPrimaryInstance } from "./app/bootstrap";
import { handleSquirrelStartup } from "./app/squirrel-startup";

function registerDefaultProtocolClient(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
    return;
  }

  app.setAsDefaultProtocolClient(APP_PROTOCOL);
}

function startApp(): void {
  configureUserDataPath();
  registerDefaultProtocolClient();

  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    app.quit();
  } else {
    startPrimaryInstance();
  }
}

void handleSquirrelStartup().then((squirrelStartupHandled) => {
  if (!squirrelStartupHandled) {
    startApp();
  }
});
