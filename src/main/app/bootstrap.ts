import { app } from "electron";

import { reportProcessError } from "../features/telemetry";
import { registerPrivilegedSchemes } from "./protocols";
import { createBackendRuntime } from "./runtime";

function configureMacOSAppBehavior(): void {
  if (process.platform !== "darwin") {
    return;
  }

  app.setActivationPolicy("accessory");
  app.dock?.hide();
}

export function startPrimaryInstance(): void {
  registerPrivilegedSchemes();

  const runtime = createBackendRuntime();

  process.on("uncaughtException", (error) => {
    reportProcessError(runtime.telemetryService, "process.uncaughtException", error);
    console.error("Uncaught main process exception", error);
  });

  process.on("unhandledRejection", (error) => {
    reportProcessError(runtime.telemetryService, "process.unhandledRejection", error);
    console.error("Unhandled main process rejection", error);
  });

  app.on("second-instance", (_event, argv) => {
    runtime.handleSecondInstance(argv);
  });

  app.on("open-url", (event, urlText) => {
    event.preventDefault();
    runtime.handleOpenUrl(urlText);
  });

  void app.whenReady().then(async () => {
    configureMacOSAppBehavior();
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
