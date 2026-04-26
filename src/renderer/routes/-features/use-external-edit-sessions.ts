import {
  listExternalEditSessions,
  onExternalEditSessionsChanged,
  type ExternalEditSession,
} from "@renderer/clients";
import { useEffect, useMemo, useState } from "react";

interface UseExternalEditSessionsResult {
  sessions: ExternalEditSession[];
  sessionsByBlockId: Map<string, ExternalEditSession>;
}

export function useExternalEditSessions(): UseExternalEditSessionsResult {
  const [sessions, setSessions] = useState<ExternalEditSession[]>([]);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;

    const unlisten = onExternalEditSessionsChanged((nextSessions) => {
      receivedEvent = true;
      setSessions(nextSessions);
    });
    void listExternalEditSessions()
      .then((nextSessions) => {
        if (active && !receivedEvent) {
          setSessions(nextSessions);
        }
      })
      .catch((error: unknown) => console.warn("Failed to load external edit sessions", error));

    return () => {
      active = false;
      unlisten();
    };
  }, []);

  const sessionsByBlockId = useMemo(() => {
    return new Map(sessions.map((session) => [session.blockId, session]));
  }, [sessions]);

  return { sessions, sessionsByBlockId };
}
