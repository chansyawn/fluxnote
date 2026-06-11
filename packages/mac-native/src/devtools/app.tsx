import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  DevtoolsCaptureEvent,
  DevtoolsErrorPayload,
  DevtoolsStatus,
  DevtoolsWriteBackRequest,
} from "./types";

type RequestState = "idle" | "loading" | "error";

const defaultStatus: DevtoolsStatus = {
  accessibilityTrusted: false,
  supported: false,
};

const CAPTURE_COUNTDOWN_SECONDS = 3;

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json()) as unknown;
  if (!response.ok) {
    const error = data as Partial<DevtoolsErrorPayload>;
    throw new Error(error.message ?? `Request failed with status ${response.status}`);
  }
  return data as T;
}

function formatValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-zinc-200 bg-white text-zinc-600",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function ErrorPanel({ error }: { error: DevtoolsErrorPayload }) {
  return (
    <section className="rounded-md border border-rose-200 bg-rose-50 p-4">
      <div className="text-sm font-semibold text-rose-900">{error.code ?? error.name}</div>
      <div className="mt-1 text-sm text-rose-800">{error.message}</div>
      {error.details === undefined ? null : (
        <pre className="mt-3 max-h-56 overflow-auto rounded border border-rose-100 bg-white p-3 text-xs text-rose-950">
          {formatValue(error.details)}
        </pre>
      )}
    </section>
  );
}

export function App() {
  const [status, setStatus] = useState<DevtoolsStatus>(defaultStatus);
  const [statusState, setStatusState] = useState<RequestState>("loading");
  const [captureState, setCaptureState] = useState<RequestState>("idle");
  const [writeBackState, setWriteBackState] = useState<RequestState>("idle");
  const [lastEvent, setLastEvent] = useState<DevtoolsCaptureEvent | null>(null);
  const [contentDraft, setContentDraft] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [writeBackMessage, setWriteBackMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setStatusState("loading");
    try {
      setStatus(await readJson<DevtoolsStatus>("/__mac-native-devtools/status"));
      setStatusState("idle");
    } catch {
      setStatusState("error");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const events = new EventSource("/__mac-native-devtools/events");
    events.addEventListener("capture", (event) => {
      const captureEvent = JSON.parse((event as MessageEvent<string>).data) as DevtoolsCaptureEvent;
      setLastEvent(captureEvent);
      setCaptureState(captureEvent.type === "capture:error" ? "error" : "idle");
      setWriteBackMessage(null);
      if (captureEvent.type === "capture:success" && captureEvent.result.kind === "editableText") {
        setContentDraft(captureEvent.result.text);
      }
      void refreshStatus();
    });
    events.addEventListener("status", () => {
      void refreshStatus();
    });
    return () => {
      events.close();
    };
  }, [refreshStatus]);

  const captureNow = useCallback(async () => {
    setCaptureState("loading");
    setWriteBackMessage(null);
    try {
      const event = await readJson<DevtoolsCaptureEvent>("/__mac-native-devtools/capture", {
        method: "POST",
      });
      setLastEvent(event);
      if (event.type === "capture:success" && event.result.kind === "editableText") {
        setContentDraft(event.result.text);
      }
      setCaptureState(event.type === "capture:error" ? "error" : "idle");
      await refreshStatus();
    } catch (error) {
      setCaptureState("error");
      setLastEvent({
        capturedAt: new Date().toISOString(),
        error: {
          message: error instanceof Error ? error.message : "Capture request failed.",
          name: "RequestError",
        },
        type: "capture:error",
      });
    }
  }, [refreshStatus]);

  const captureAfterCountdown = useCallback(() => {
    if (captureState === "loading" || countdown !== null) {
      return;
    }

    setCaptureState("loading");
    setWriteBackMessage(null);
    setCountdown(CAPTURE_COUNTDOWN_SECONDS);
  }, [captureState, countdown]);

  useEffect(() => {
    if (countdown === null) {
      return undefined;
    }

    if (countdown === 0) {
      setCountdown(null);
      void captureNow();
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => (current === null ? null : current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [captureNow, countdown]);

  const result = lastEvent?.type === "capture:success" ? lastEvent.result : null;
  const canWriteBack = result?.kind === "editableText";

  const targetRows = useMemo(() => {
    if (!result) {
      return [];
    }
    return [
      ["App", result.target.appName ?? "-"],
      ["Bundle ID", result.target.appBundleId ?? "-"],
      ["Process ID", String(result.target.processId)],
      ["Element role", result.target.elementRole ?? "-"],
    ];
  }, [result]);

  const writeBack = useCallback(async () => {
    if (!canWriteBack) {
      return;
    }
    setWriteBackState("loading");
    setWriteBackMessage(null);
    const request: DevtoolsWriteBackRequest = {
      content: contentDraft,
      textRef: result.textRef,
    };
    try {
      await readJson<{ ok: true }>("/__mac-native-devtools/write-back", {
        body: JSON.stringify(request),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      setWriteBackState("idle");
      setWriteBackMessage("Write-back completed.");
    } catch (error) {
      setWriteBackState("error");
      setWriteBackMessage(error instanceof Error ? error.message : "Write-back failed.");
    }
  }, [canWriteBack, contentDraft, result]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-6 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            Mac Native Devtools
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill
              active={status.supported}
              label={status.supported ? "macOS supported" : "Unsupported"}
            />
            <StatusPill
              active={status.accessibilityTrusted}
              label={
                status.accessibilityTrusted ? "Accessibility trusted" : "Accessibility required"
              }
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={statusState === "loading"}
            onClick={() => void refreshStatus()}
            type="button"
          >
            Refresh
          </button>
          <button
            className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={captureState === "loading" || countdown !== null}
            onClick={captureAfterCountdown}
            type="button"
          >
            {countdown === null ? "Capture In 3s" : `Capturing in ${countdown}s`}
          </button>
          <button
            className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={captureState === "loading" || countdown !== null}
            onClick={() => void captureNow()}
            type="button"
          >
            {captureState === "loading" && countdown === null ? "Capturing..." : "Capture Now"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-[320px_1fr] gap-5">
        <aside className="rounded-md border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-950">Target</h2>
          {targetRows.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">No capture yet.</div>
          ) : (
            <dl className="mt-3 space-y-3">
              {targetRows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-zinc-500 uppercase">{label}</dt>
                  <dd className="mt-1 text-sm break-words text-zinc-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </aside>

        <section className="flex flex-col gap-4">
          {lastEvent?.type === "capture:error" ? <ErrorPanel error={lastEvent.error} /> : null}

          {result ? (
            <div className="rounded-md border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-950">Capture Result</h2>
                <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                  {result.kind}
                </span>
              </div>
              {result.kind === "targetOnly" ? (
                <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {result.reason}
                </div>
              ) : (
                <div className="mt-4">
                  <label
                    className="text-xs font-medium text-zinc-500 uppercase"
                    htmlFor="capture-content"
                  >
                    Content
                  </label>
                  <textarea
                    className="mt-2 min-h-72 w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-sm leading-6 text-zinc-950 outline-none focus:border-zinc-500"
                    id="capture-content"
                    onChange={(event) => setContentDraft(event.target.value)}
                    value={contentDraft}
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={writeBackState === "loading"}
                      onClick={() => void writeBack()}
                      type="button"
                    >
                      {writeBackState === "loading" ? "Writing..." : "Write Back"}
                    </button>
                    {writeBackMessage ? (
                      <span
                        className={[
                          "text-sm",
                          writeBackState === "error" ? "text-rose-700" : "text-emerald-700",
                        ].join(" ")}
                      >
                        {writeBackMessage}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-zinc-200 bg-white p-8 text-sm text-zinc-500">
              Start a countdown, focus another app, then wait for capture to run.
            </div>
          )}

          {lastEvent ? (
            <details className="rounded-md border border-zinc-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
                Raw Event
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-900">
                {formatValue(lastEvent)}
              </pre>
            </details>
          ) : null}
        </section>
      </section>
    </main>
  );
}
