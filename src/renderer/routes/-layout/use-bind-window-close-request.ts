import { hideWindow, onWindowCloseRequested } from "@renderer/features/window/window-api";
import { useEffect } from "react";

export function useBindWindowCloseRequest() {
  useEffect(() => {
    const unlisten = onWindowCloseRequested(() => {
      void hideWindow();
    });

    return () => {
      unlisten();
    };
  }, []);
}
