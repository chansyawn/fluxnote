import {
  acknowledgePendingOpenBlock,
  onOpenBlockRequested,
  readPendingOpenBlock,
  type OpenBlockRequestedPayload,
} from "@renderer/clients";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface OpenBlockRequestContextValue {
  acknowledgePendingBlockId: (blockId: string) => void;
  pendingTarget: OpenBlockRequestedPayload | null;
}

const OpenBlockRequestContext = createContext<OpenBlockRequestContextValue | null>(null);

interface OpenBlockRequestProviderProps {
  children: ReactNode;
}

export function OpenBlockRequestProvider({ children }: OpenBlockRequestProviderProps) {
  const [pendingTarget, setPendingTarget] = useState<OpenBlockRequestedPayload | null>(null);

  useEffect(() => {
    let active = true;
    const unlisten = onOpenBlockRequested((payload) => {
      setPendingTarget(payload);
    });
    void readPendingOpenBlock()
      .then((pending) => {
        if (active && pending.target) {
          setPendingTarget(pending.target);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
      unlisten();
    };
  }, []);

  const acknowledgePendingBlockId = useCallback((blockId: string) => {
    setPendingTarget((currentTarget) =>
      currentTarget?.blockId === blockId ? null : currentTarget,
    );
    void acknowledgePendingOpenBlock(blockId).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ acknowledgePendingBlockId, pendingTarget }),
    [acknowledgePendingBlockId, pendingTarget],
  );

  return (
    <OpenBlockRequestContext.Provider value={value}>{children}</OpenBlockRequestContext.Provider>
  );
}

export function OpenBlockWorkspaceRouteSync() {
  const { pendingTarget } = useOpenBlockRequest();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pendingTarget || location.pathname === "/") {
      return;
    }

    void navigate({ to: "/" });
  }, [location.pathname, navigate, pendingTarget]);

  return null;
}

export function useOpenBlockRequest(): OpenBlockRequestContextValue {
  const context = useContext(OpenBlockRequestContext);
  if (!context) {
    throw new Error("useOpenBlockRequest must be used inside OpenBlockRequestProvider.");
  }
  return context;
}
