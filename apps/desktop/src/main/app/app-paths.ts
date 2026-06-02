import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { APP_USER_DATA_DIR_NAME } from "@shared/app/app-config";
import { app } from "electron";

export function configureUserDataPath(): void {
  const defaultSessionDataPath = app.getPath("sessionData");
  const defaultLogsPath = app.getPath("logs");
  const userDataPath = path.join(os.homedir(), APP_USER_DATA_DIR_NAME);
  app.setPath("userData", userDataPath);
  app.setPath("sessionData", defaultSessionDataPath);
  app.setPath("logs", defaultLogsPath);
  fs.mkdirSync(userDataPath, { recursive: true });
}
