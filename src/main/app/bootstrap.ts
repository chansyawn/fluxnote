import { app } from "electron";

import { registerPrivilegedSchemes } from "./protocols";
import { createBackendRuntime } from "./runtime";

export function startPrimaryInstance(): void {
  registerPrivilegedSchemes();

  const runtime = createBackendRuntime();

  app.on("second-instance", (_event, argv) => {
    runtime.handleSecondInstance(argv);
  });

  app.on("open-url", (event, urlText) => {
    event.preventDefault();
    runtime.handleOpenUrl(urlText);
  });

  void app.whenReady().then(async () => {
    app.dock?.hide();
    await runtime.start();

    app.on("activate", () => {
      runtime.activate();
    });
  });

  app.on("before-quit", () => {
    void runtime.stop();
  });

  app.on("window-all-closed", () => {
    runtime.quitWhenAllWindowsClosed();
  });
}
