import ApplicationServices
import Foundation

@objc(MacNativeBridge)
public final class MacNativeBridge: NSObject {
  private let sessions = AccessibilitySessionStore()

  @objc
  public func isAccessibilityTrusted(_ prompt: Bool) -> Bool {
    if prompt {
      let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
      return AXIsProcessTrustedWithOptions(options)
    }
    return AXIsProcessTrusted()
  }

  @objc
  public func captureTextJson() -> String {
    encodeEnvelope {
      try sessions.capture()
    }
  }

  @objc
  public func replaceTextJson(_ textRef: String, text: String) -> String {
    encodeEnvelope {
      try sessions.replaceText(textRef: textRef, text: text)
      return [:]
    }
  }

  @objc
  public func releaseTextJson(_ textRef: String) -> String {
    encodeEnvelope {
      sessions.releaseText(textRef)
      return [:]
    }
  }

  @objc
  public func activateApplicationJson(_ processId: Int32) -> String {
    encodeEnvelope {
      try sessions.activate(processId: processId)
      return [:]
    }
  }
}

private func encodeEnvelope(_ operation: () throws -> [String: Any]) -> String {
  do {
    return stringifyJson([
      "ok": true,
      "data": try operation(),
    ])
  } catch let failure as MacNativeFailure {
    return stringifyJson([
      "ok": false,
      "code": failure.code,
      "error": failure.message,
      "details": failure.details ?? NSNull(),
    ])
  } catch {
    return stringifyJson([
      "ok": false,
      "code": MacNativeErrorCode.internalError,
      "error": String(describing: error),
      "details": NSNull(),
    ])
  }
}

private func stringifyJson(_ value: [String: Any]) -> String {
  guard
    JSONSerialization.isValidJSONObject(value),
    let data = try? JSONSerialization.data(withJSONObject: value, options: []),
    let json = String(data: data, encoding: .utf8)
  else {
    return #"{"ok":false,"code":"NATIVE.INTERNAL","error":"Unable to encode native response.","details":null}"#
  }
  return json
}

func normalizedTargetMetadata(_ metadata: [String: Any]?) -> [String: Any] {
  [
    "appBundleId": metadata?["appBundleId"] ?? NSNull(),
    "appIcon": metadata?["appIcon"] ?? NSNull(),
    "appName": metadata?["appName"] ?? NSNull(),
    "elementRole": metadata?["elementRole"] ?? NSNull(),
    "processId": metadata?["processId"] ?? 0,
  ]
}

func targetMetadata(processId: pid_t, role: String?) -> [String: Any] {
  var metadata = normalizedTargetMetadata(applicationMetadata(processId: processId))
  metadata["elementRole"] = nullableString(role)
  return metadata
}

func nullableString(_ value: String?) -> Any {
  value ?? NSNull()
}
