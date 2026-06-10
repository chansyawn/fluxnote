import AppKit
import ApplicationServices
import Foundation

final class AccessibilitySession {
  private var focusedElement: AXUIElement?

  func capture() throws -> [String: Any] {
    guard AXIsProcessTrusted() else {
      throw HelperFailure(
        code: HelperErrorCode.permissionRequired,
        message: "Accessibility permission is not granted.",
        data: nil,
      )
    }

    let focusedAppResult = copyFocusedApplicationElement()
    guard let focusedApp = focusedAppResult.element else {
      if focusedAppResult.error == .apiDisabled {
        throw HelperFailure(
          code: HelperErrorCode.permissionRequired,
          message: "Accessibility permission is not granted.",
          data: nil,
        )
      }
      throw HelperFailure(
        code: HelperErrorCode.noEditableElement,
        message: messageWithAXError(
          "Unable to read the focused application.",
          focusedAppResult.error,
        ),
        data: frontmostApplicationMetadata(),
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
        throw HelperFailure(
          code: HelperErrorCode.permissionRequired,
          message: "Accessibility permission is not granted.",
          data: nil,
        )
      }
      throw HelperFailure(
        code: HelperErrorCode.noEditableElement,
        message: messageWithAXError(
          lookup.searchBudgetExhausted
            ? "No focused editable element was found before the search budget was exhausted."
            : "No focused editable element was found.",
          lookup.error,
        ),
        data: metadata,
      )
    }

    let role = copyStringAttribute(element, kAXRoleAttribute as CFString)
    if role == "AXSecureTextField" {
      throw HelperFailure(
        code: HelperErrorCode.secureTextField,
        message: "Secure text fields are not supported.",
        data: nil,
      )
    }

    guard let value = copyStringAttribute(element, kAXValueAttribute as CFString) else {
      throw HelperFailure(
        code: HelperErrorCode.unsupportedElement,
        message: "The focused element does not expose editable text.",
        data: elementFailureMetadata(applicationMetadata: metadata, role: role),
      )
    }

    focusedElement = element

    var processId: pid_t = 0
    AXUIElementGetPid(element, &processId)
    let application = NSRunningApplication(processIdentifier: processId)

    return [
      "appBundleId": nullableString(application?.bundleIdentifier),
      "appName": nullableString(application?.localizedName),
      "content": value,
      "elementRole": nullableString(role),
      "processId": Int(processId),
    ]
  }

  func writeBack(_ content: String) throws {
    guard let focusedElement else {
      throw HelperFailure(
        code: HelperErrorCode.noCapturedElement,
        message: "No focused editable element was captured.",
        data: nil,
      )
    }

    let result = AXUIElementSetAttributeValue(
      focusedElement,
      kAXValueAttribute as CFString,
      content as CFString,
    )
    guard result == .success else {
      throw HelperFailure(
        code: HelperErrorCode.writeBackFailed,
        message: "Unable to write edited text back: \(axErrorDescription(result))",
        data: nil,
      )
    }
    activateApplication(from: focusedElement)
  }
}
