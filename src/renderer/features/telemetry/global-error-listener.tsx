import { captureRendererError } from "@renderer/features/telemetry/telemetry-client";
import { useEffect } from "react";

export function GlobalTelemetryErrorListener() {
  useEffect(() => {
    function handleError(event: ErrorEvent): void {
      captureRendererError(event.error ?? event.message, {
        pathname: window.location.pathname,
        source: "window.error",
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent): void {
      captureRendererError(event.reason, {
        pathname: window.location.pathname,
        source: "window.unhandledrejection",
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
