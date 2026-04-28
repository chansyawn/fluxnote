import { hideWindow, onWindowCloseRequested } from "@renderer/clients/window";
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
