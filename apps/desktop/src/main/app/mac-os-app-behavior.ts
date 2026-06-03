import { app } from "electron";

export function configureMacOSAppBehavior(): void {
  if (process.platform !== "darwin") {
    return;
  }

  app.setActivationPolicy("accessory");
}
