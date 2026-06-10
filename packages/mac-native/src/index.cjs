"use strict";

const path = require("node:path");

class MacNativeError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "MacNativeError";
  }
}

let addonCache;

function createUnsupportedError() {
  return new MacNativeError(
    "NATIVE.UNSUPPORTED_PLATFORM",
    "macOS native integrations are only supported on macOS.",
  );
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function parseNullableString(value) {
  if (value === null || typeof value === "string") {
    return value;
  }
  throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native target metadata.");
}

function parseTarget(value) {
  if (!isRecord(value)) {
    throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native target metadata.");
  }

  const processId = value.processId;
  if (typeof processId !== "number" || !Number.isInteger(processId) || processId < 0) {
    throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native target process id.");
  }

  return {
    appBundleId: parseNullableString(value.appBundleId),
    appName: parseNullableString(value.appName),
    elementRole: parseNullableString(value.elementRole),
    processId,
  };
}

function parseCaptureResult(value) {
  if (!isRecord(value)) {
    throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native capture result.");
  }

  if (value.mode === "write_back") {
    if (typeof value.sessionId !== "string" || typeof value.content !== "string") {
      throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native write-back capture.");
    }
    return {
      content: value.content,
      mode: "write_back",
      sessionId: value.sessionId,
      target: parseTarget(value.target),
    };
  }

  if (value.mode === "copy_only") {
    if (
      value.content !== "" ||
      (value.reason !== "NO_EDITABLE_ELEMENT" &&
        value.reason !== "SEARCH_BUDGET_EXHAUSTED" &&
        value.reason !== "UNSUPPORTED_ELEMENT")
    ) {
      throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native copy-only capture.");
    }
    return {
      content: "",
      mode: "copy_only",
      reason: value.reason,
      target: parseTarget(value.target),
    };
  }

  throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native capture mode.");
}

function parseEnvelope(json) {
  const parsed = JSON.parse(json);
  if (!isRecord(parsed) || typeof parsed.ok !== "boolean") {
    throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native response envelope.");
  }
  return {
    code: parsed.code,
    data: parsed.data,
    details: parsed.details,
    error: parsed.error,
    ok: parsed.ok,
  };
}

function unwrapEnvelope(json) {
  const envelope = parseEnvelope(json);
  if (envelope.ok) {
    return envelope.data;
  }

  if (typeof envelope.code !== "string") {
    throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native error envelope.");
  }
  throw new MacNativeError(
    envelope.code,
    typeof envelope.error === "string" ? envelope.error : "macOS native integration failed.",
    envelope.details,
  );
}

function resolveAddonPath() {
  return path.join(__dirname, "..", "build", "Release", "mac_native.node");
}

function loadAddon() {
  if (addonCache) {
    return addonCache;
  }

  try {
    addonCache = require(resolveAddonPath());
    return addonCache;
  } catch (error) {
    throw new MacNativeError(
      "NATIVE.ADDON_LOAD_FAILED",
      error instanceof Error ? error.message : "Unable to load macOS native addon.",
      { cause: error },
    );
  }
}

function createUnsupportedNative() {
  return {
    activate: async () => {
      throw createUnsupportedError();
    },
    capture: async () => {
      throw createUnsupportedError();
    },
    closeSession: async () => undefined,
    isAccessibilityTrusted: () => false,
    isSupported: () => false,
    writeBack: async () => {
      throw createUnsupportedError();
    },
  };
}

function createMacAccessibilityNative() {
  if (process.platform !== "darwin") {
    return createUnsupportedNative();
  }

  const addon = loadAddon();
  return {
    activate: async (processId) => {
      unwrapEnvelope(addon.activateJson(processId));
    },
    capture: async () => parseCaptureResult(unwrapEnvelope(addon.captureJson())),
    closeSession: async (sessionId) => {
      unwrapEnvelope(addon.closeSessionJson(sessionId));
    },
    isAccessibilityTrusted: (prompt) => addon.isAccessibilityTrusted(prompt),
    isSupported: () => true,
    writeBack: async (sessionId, content) => {
      unwrapEnvelope(addon.writeBackJson(sessionId, content));
    },
  };
}

module.exports = {
  MacNativeError,
  createMacAccessibilityNative,
};
