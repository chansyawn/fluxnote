import { app } from "electron";

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
