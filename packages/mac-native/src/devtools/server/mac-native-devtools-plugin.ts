import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite-plus";

import type { MacAccessibilityNative } from "../../index";
import type { DevtoolsCaptureEvent, DevtoolsStatus, DevtoolsWriteBackRequest } from "../types";
import { serializeError } from "./serialize-error";

const API_PREFIX = "/__mac-native-devtools";

interface DevtoolsState {
  clients: Set<ServerResponse>;
  native: MacAccessibilityNative | null;
  runningCapture: boolean;
}

function createState(): DevtoolsState {
  return {
    clients: new Set(),
    native: null,
    runningCapture: false,
  };
}

function sendJson(response: ServerResponse, statusCode: number, data: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(data));
}

function sendNotFound(response: ServerResponse): void {
  sendJson(response, 404, {
    message: "Devtools endpoint not found.",
    name: "NotFoundError",
  });
}

function sendMethodNotAllowed(response: ServerResponse): void {
  sendJson(response, 405, {
    message: "Method not allowed.",
    name: "MethodNotAllowedError",
  });
}

async function readRequestJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.length === 0) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
}

function writeSse(response: ServerResponse, event: string, data: unknown): void {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(state: DevtoolsState, event: string, data: unknown): void {
  for (const client of state.clients) {
    writeSse(client, event, data);
  }
}

async function getNative(state: DevtoolsState): Promise<MacAccessibilityNative> {
  if (state.native) {
    return state.native;
  }

  const { createMacAccessibilityNative } = await import("../../index");
  state.native = createMacAccessibilityNative();
  return state.native;
}

async function getStatus(state: DevtoolsState): Promise<DevtoolsStatus> {
  const native = await getNative(state);
  return {
    accessibilityTrusted: native.isAccessibilityTrusted(false),
    supported: native.isSupported(),
  };
}

async function capture(state: DevtoolsState): Promise<DevtoolsCaptureEvent> {
  const capturedAt = new Date().toISOString();

  if (state.runningCapture) {
    return {
      capturedAt,
      error: {
        message: "A capture request is already running.",
        name: "CaptureInFlightError",
      },
      type: "capture:error",
    };
  }

  state.runningCapture = true;
  try {
    const native = await getNative(state);
    if (!native.isAccessibilityTrusted(true)) {
      return {
        capturedAt,
        error: {
          code: "ACCESSIBILITY.PERMISSION_REQUIRED",
          message: "Accessibility permission is not granted.",
          name: "MacNativeError",
        },
        type: "capture:error",
      };
    }

    return {
      capturedAt,
      result: await native.capture(),
      type: "capture:success",
    };
  } catch (error) {
    return {
      capturedAt,
      error: serializeError(error),
      type: "capture:error",
    };
  } finally {
    state.runningCapture = false;
  }
}

async function handleCapture(state: DevtoolsState, response: ServerResponse): Promise<void> {
  const event = await capture(state);
  broadcast(state, "capture", event);
  sendJson(response, event.type === "capture:error" ? 500 : 200, event);
}

async function handleWriteBack(
  state: DevtoolsState,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const body = await readRequestJson<DevtoolsWriteBackRequest>(request);
    if (typeof body.sessionId !== "string" || typeof body.content !== "string") {
      sendJson(response, 400, {
        message: "write-back requires sessionId and content strings.",
        name: "InvalidRequestError",
      });
      return;
    }

    const native = await getNative(state);
    await native.writeBack(body.sessionId, body.content);
    await native.closeSession(body.sessionId);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, serializeError(error));
  }
}

async function handleEvents(
  state: DevtoolsState,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  response.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
  });
  response.write("\n");
  state.clients.add(response);
  writeSse(response, "status", await getStatus(state));

  request.on("close", () => {
    state.clients.delete(response);
  });
}

export function macNativeDevtoolsPlugin(): Plugin {
  const state = createState();

  return {
    configureServer(server) {
      server.httpServer?.once("close", () => {
        for (const client of state.clients) {
          client.end();
        }
        state.clients.clear();
      });

      server.middlewares.use((request, response, next) => {
        const url = request.url ?? "";
        if (!url.startsWith(API_PREFIX)) {
          next();
          return;
        }

        void (async () => {
          if (url === `${API_PREFIX}/status`) {
            if (request.method !== "GET") {
              sendMethodNotAllowed(response);
              return;
            }
            sendJson(response, 200, await getStatus(state));
            return;
          }

          if (url === `${API_PREFIX}/events`) {
            if (request.method !== "GET") {
              sendMethodNotAllowed(response);
              return;
            }
            await handleEvents(state, request, response);
            return;
          }

          if (url === `${API_PREFIX}/capture`) {
            if (request.method !== "POST") {
              sendMethodNotAllowed(response);
              return;
            }
            await handleCapture(state, response);
            return;
          }

          if (url === `${API_PREFIX}/write-back`) {
            if (request.method !== "POST") {
              sendMethodNotAllowed(response);
              return;
            }
            await handleWriteBack(state, request, response);
            return;
          }

          sendNotFound(response);
        })().catch((error: unknown) => {
          sendJson(response, 500, serializeError(error));
        });
      });
    },
    name: "mac-native-devtools",
  };
}
