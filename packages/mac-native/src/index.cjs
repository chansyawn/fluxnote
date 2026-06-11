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
    appIcon: parseNullableString(value.appIcon),
    appName: parseNullableString(value.appName),
    elementRole: parseNullableString(value.elementRole),
    processId,
  };
}

function parseTextCapture(value) {
  if (!isRecord(value)) {
    throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native capture result.");
  }

  if (value.kind === "editableText") {
    if (typeof value.textRef !== "string" || typeof value.text !== "string") {
      throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native editable text capture.");
    }
    return {
      kind: "editableText",
      target: parseTarget(value.target),
      text: value.text,
      textRef: value.textRef,
    };
  }

  if (value.kind === "targetOnly") {
    if (
      value.reason !== "NO_EDITABLE_ELEMENT" &&
      value.reason !== "SEARCH_BUDGET_EXHAUSTED" &&
      value.reason !== "UNSUPPORTED_ELEMENT"
    ) {
      throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native target-only capture.");
    }
    return {
      kind: "targetOnly",
      reason: value.reason,
      target: parseTarget(value.target),
    };
  }

  throw new MacNativeError("NATIVE.INVALID_PAYLOAD", "Invalid native capture kind.");
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
    activateApplication: async () => {
      throw createUnsupportedError();
    },
    captureText: async () => {
      throw createUnsupportedError();
    },
    isAccessibilityTrusted: () => false,
    isSupported: () => false,
    releaseText: async () => undefined,
    replaceText: async () => {
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
    activateApplication: async (processId) => {
      unwrapEnvelope(addon.activateApplicationJson(processId));
    },
    captureText: async () => parseTextCapture(unwrapEnvelope(addon.captureTextJson())),
    isAccessibilityTrusted: (prompt) => addon.isAccessibilityTrusted(prompt),
    isSupported: () => true,
    releaseText: async (textRef) => {
      unwrapEnvelope(addon.releaseTextJson(textRef));
    },
    replaceText: async (textRef, text) => {
      unwrapEnvelope(addon.replaceTextJson(textRef, text));
    },
  };
}

module.exports = {
  MacNativeError,
  createMacAccessibilityNative,
};
