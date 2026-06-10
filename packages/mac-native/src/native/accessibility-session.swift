import AppKit
import ApplicationServices
import Foundation

private let maxNativeSessions = 64
private let nativeSessionTtlSeconds: TimeInterval = 24 * 60 * 60

private struct StoredAccessibilitySession {
  let createdAt: Date
  let element: AXUIElement
}

final class AccessibilitySessionStore {
  private var sessions: [String: StoredAccessibilitySession] = [:]

  func capture() throws -> [String: Any] {
    guard AXIsProcessTrusted() else {
      throw MacNativeFailure(
        code: MacNativeErrorCode.permissionRequired,
        message: "Accessibility permission is not granted.",
        details: nil,
      )
    }

    let focusedAppResult = copyFocusedApplicationElement()
    guard let focusedApp = focusedAppResult.element else {
      if focusedAppResult.error == .apiDisabled {
        throw MacNativeFailure(
          code: MacNativeErrorCode.permissionRequired,
          message: "Accessibility permission is not granted.",
          details: nil,
        )
      }
      return copyOnlyCapture(
        reason: MacAccessibilityCopyOnlyReason.noEditableElement,
        metadata: frontmostApplicationMetadata(),
      )
    }

    let metadata = applicationMetadata(from: focusedApp)
    enableEnhancedUserInterface(for: focusedApp)
    var lookup = copyFocusedUIElement(from: focusedApp)
    if lookup.element == nil && enableManualAccessibility(for: focusedApp) {
      lookup = copyFocusedUIElement(from: focusedApp)
    }

    guard let element = lookup.element else {
      if lookup.error == .apiDisabled {
        throw MacNativeFailure(
          code: MacNativeErrorCode.permissionRequired,
          message: "Accessibility permission is not granted.",
          details: nil,
        )
      }

      return copyOnlyCapture(
        reason: lookup.searchBudgetExhausted
          ? MacAccessibilityCopyOnlyReason.searchBudgetExhausted
          : MacAccessibilityCopyOnlyReason.noEditableElement,
        metadata: metadata,
      )
    }

    let role = copyStringAttribute(element, kAXRoleAttribute as CFString)
    if role == "AXSecureTextField" {
      throw MacNativeFailure(
        code: MacNativeErrorCode.secureTextField,
        message: "Secure text fields are not supported.",
        details: elementFailureMetadata(applicationMetadata: metadata, role: role),
      )
    }

    guard let value = copyStringAttribute(element, kAXValueAttribute as CFString) else {
      return copyOnlyCapture(
        reason: MacAccessibilityCopyOnlyReason.unsupportedElement,
        metadata: elementFailureMetadata(applicationMetadata: metadata, role: role),
      )
    }

    let sessionId = try createSession(element: element)
    var processId: pid_t = 0
    AXUIElementGetPid(element, &processId)

    return [
      "mode": "write_back",
      "sessionId": sessionId,
      "content": value,
      "target": targetMetadata(processId: processId, role: role),
    ]
  }

  func closeSession(_ sessionId: String) {
    sessions.removeValue(forKey: sessionId)
  }

  func writeBack(sessionId: String, content: String) throws {
    guard AXIsProcessTrusted() else {
      throw MacNativeFailure(
        code: MacNativeErrorCode.permissionRequired,
        message: "Accessibility permission is not granted.",
        details: nil,
      )
    }

    guard let session = sessions[sessionId] else {
      throw MacNativeFailure(
        code: MacNativeErrorCode.sessionNotFound,
        message: "Native accessibility session was not found.",
        details: nil,
      )
    }

    let result = AXUIElementSetAttributeValue(
      session.element,
      kAXValueAttribute as CFString,
      content as CFString,
    )
    guard result == .success else {
      throw MacNativeFailure(
        code: MacNativeErrorCode.writeBackFailed,
        message: "Unable to write edited text back: \(axErrorDescription(result))",
        details: nil,
      )
    }
    activateApplication(from: session.element)
  }

  func activate(processId: Int32) throws {
    guard activateApplication(processId: processId) else {
      throw MacNativeFailure(
        code: MacNativeErrorCode.activateFailed,
        message: "Unable to activate focused application.",
        details: applicationMetadata(processId: processId),
      )
    }
  }

  private func createSession(element: AXUIElement) throws -> String {
    pruneExpiredSessions()
    guard sessions.count < maxNativeSessions else {
      throw MacNativeFailure(
        code: MacNativeErrorCode.sessionLimitExceeded,
        message: "Too many active native accessibility sessions.",
        details: ["limit": maxNativeSessions],
      )
    }

    let sessionId = UUID().uuidString
    sessions[sessionId] = StoredAccessibilitySession(createdAt: Date(), element: element)
    return sessionId
  }

  private func pruneExpiredSessions() {
    let now = Date()
    sessions = sessions.filter { _, session in
      now.timeIntervalSince(session.createdAt) <= nativeSessionTtlSeconds
    }
  }

  private func copyOnlyCapture(reason: String, metadata: [String: Any]?) -> [String: Any] {
    [
      "mode": "copy_only",
      "content": "",
      "reason": reason,
      "target": normalizedTargetMetadata(metadata),
    ]
  }
}
