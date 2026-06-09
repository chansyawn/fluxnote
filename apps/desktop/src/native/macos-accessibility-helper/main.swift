import AppKit
import ApplicationServices
import Foundation

private let maxDescendantDepth = 32
private let maxVisitedDescendants = 4096

private enum HelperErrorCode {
  static let invalidPayload = "invalid_payload"
  static let invalidCommand = "invalid_command"
  static let noCapturedElement = "no_captured_element"
  static let noEditableElement = "no_editable_element"
  static let permissionRequired = "permission_required"
  static let secureTextField = "secure_text_field"
  static let unsupportedElement = "unsupported_element"
  static let writeBackFailed = "write_back_failed"
}

private struct HelperFailure: Error {
  let code: String
  let message: String
  let data: [String: Any]?
}

private struct DescendantSearchBudget {
  var exhausted = false
  var visited = 0
}

private struct DescendantSearchFrame {
  let element: AXUIElement
  let depth: Int
}

private struct DescendantSearchResult {
  let element: AXUIElement?
  let searchBudgetExhausted: Bool
}

private struct ElementLookupResult {
  let element: AXUIElement?
  let error: AXError
  let searchBudgetExhausted: Bool
}

private let editableRoles: Set<String> = [
  "AXComboBox",
  "AXSearchField",
  "AXTextArea",
  "AXTextField",
]

private func nullableString(_ value: String?) -> Any {
  value ?? NSNull()
}

private func successResponse(_ data: Any?) -> [String: Any] {
  [
    "ok": true,
    "data": data ?? NSNull(),
  ]
}

private func failureResponse(
  code: String = HelperErrorCode.writeBackFailed,
  message: String = "macOS Accessibility helper failed.",
  data: [String: Any]? = nil
) -> [String: Any] {
  var response: [String: Any] = [
    "ok": false,
    "code": code,
    "error": message,
  ]
  if let data {
    response["data"] = data
  }
  return response
}

private func failureResponse(from failure: HelperFailure) -> [String: Any] {
  failureResponse(code: failure.code, message: failure.message, data: failure.data)
}

private func emitResponse(_ response: [String: Any]) {
  guard
    JSONSerialization.isValidJSONObject(response),
    let data = try? JSONSerialization.data(withJSONObject: response)
  else {
    return
  }

  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data([0x0A]))
}

private func axErrorDescription(_ error: AXError) -> String {
  switch error {
  case .success:
    return "success"
  case .failure:
    return "failure"
  case .illegalArgument:
    return "illegal argument"
  case .invalidUIElement:
    return "invalid UI element"
  case .invalidUIElementObserver:
    return "invalid UI element observer"
  case .cannotComplete:
    return "cannot complete"
  case .attributeUnsupported:
    return "attribute unsupported"
  case .actionUnsupported:
    return "action unsupported"
  case .notificationUnsupported:
    return "notification unsupported"
  case .notImplemented:
    return "not implemented"
  case .notificationAlreadyRegistered:
    return "notification already registered"
  case .notificationNotRegistered:
    return "notification not registered"
  case .apiDisabled:
    return "Accessibility API disabled"
  case .noValue:
    return "no value"
  case .parameterizedAttributeUnsupported:
    return "parameterized attribute unsupported"
  case .notEnoughPrecision:
    return "not enough precision"
  @unknown default:
    return "unknown AXError \(error.rawValue)"
  }
}

private func messageWithAXError(_ message: String, _ error: AXError) -> String {
  "\(message) (\(axErrorDescription(error)), code \(error.rawValue))"
}

private func applicationMetadata(processId: pid_t) -> [String: Any]? {
  guard processId > 0 else {
    return nil
  }

  let application = NSRunningApplication(processIdentifier: processId)
  return [
    "appBundleId": nullableString(application?.bundleIdentifier),
    "appName": nullableString(application?.localizedName),
    "processId": Int(processId),
  ]
}

private func frontmostApplicationMetadata() -> [String: Any]? {
  guard let application = NSWorkspace.shared.frontmostApplication else {
    return nil
  }
  return applicationMetadata(processId: application.processIdentifier)
}

private func applicationMetadata(from element: AXUIElement) -> [String: Any]? {
  var processId: pid_t = 0
  AXUIElementGetPid(element, &processId)
  return applicationMetadata(processId: processId)
}

private func elementFailureMetadata(
  applicationMetadata: [String: Any]?,
  role: String?
) -> [String: Any] {
  var metadata = applicationMetadata ?? [:]
  metadata["elementRole"] = nullableString(role)
  return metadata
}

private func copyStringAttribute(_ element: AXUIElement, _ attribute: CFString) -> String? {
  var value: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(element, attribute, &value)
  guard result == .success, let value, CFGetTypeID(value) == CFStringGetTypeID() else {
    return nil
  }
  return value as? String
}

private func copyBoolAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool {
  var value: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(element, attribute, &value)
  guard result == .success, let value, CFGetTypeID(value) == CFBooleanGetTypeID() else {
    return false
  }
  return (value as? Bool) ?? false
}

private func canReadAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool {
  var value: CFTypeRef?
  return AXUIElementCopyAttributeValue(element, attribute, &value) == .success
}

private func copyElementAttribute(
  _ element: AXUIElement,
  _ attribute: CFString
) -> (element: AXUIElement?, error: AXError) {
  var value: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(element, attribute, &value)
  guard result == .success, let value, CFGetTypeID(value) == AXUIElementGetTypeID() else {
    return (nil, result)
  }
  return ((value as! AXUIElement), result)
}

private func copyElementArrayAttribute(
  _ element: AXUIElement,
  _ attribute: CFString
) -> [AXUIElement] {
  var value: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(element, attribute, &value)
  guard result == .success, let value, CFGetTypeID(value) == CFArrayGetTypeID() else {
    return []
  }
  var elements: [AXUIElement] = []
  for child in value as? [Any] ?? [] {
    let childValue = child as CFTypeRef
    if CFGetTypeID(childValue) == AXUIElementGetTypeID() {
      elements.append((child as! AXUIElement))
    }
  }
  return elements
}

private func isEditableCandidate(_ element: AXUIElement) -> Bool {
  let role = copyStringAttribute(element, kAXRoleAttribute as CFString)
  if role == "AXSecureTextField" {
    return false
  }
  if let role, editableRoles.contains(role) {
    return true
  }
  return canReadAttribute(element, kAXValueAttribute as CFString)
}

private func pushElementChildren(
  into stack: inout [DescendantSearchFrame],
  from element: AXUIElement,
  attribute: CFString,
  depth: Int
) {
  for child in copyElementArrayAttribute(element, attribute).reversed() {
    stack.append(DescendantSearchFrame(element: child, depth: depth))
  }
}

private func copyFocusedEditableDescendant(
  from root: AXUIElement,
  budget: inout DescendantSearchBudget
) -> DescendantSearchResult {
  var stack = [DescendantSearchFrame(element: root, depth: 0)]

  while let frame = stack.popLast() {
    if frame.depth > maxDescendantDepth {
      continue
    }

    if budget.visited >= maxVisitedDescendants {
      budget.exhausted = true
      return DescendantSearchResult(element: nil, searchBudgetExhausted: true)
    }
    budget.visited += 1

    if
      copyBoolAttribute(frame.element, kAXFocusedAttribute as CFString),
      isEditableCandidate(frame.element)
    {
      return DescendantSearchResult(element: frame.element, searchBudgetExhausted: false)
    }

    let childDepth = frame.depth + 1
    if childDepth <= maxDescendantDepth {
      pushElementChildren(
        into: &stack,
        from: frame.element,
        attribute: kAXChildrenAttribute as CFString,
        depth: childDepth,
      )
      pushElementChildren(
        into: &stack,
        from: frame.element,
        attribute: kAXContentsAttribute as CFString,
        depth: childDepth,
      )
    }
  }

  return DescendantSearchResult(element: nil, searchBudgetExhausted: false)
}

private func copyFocusedApplicationElement() -> (element: AXUIElement?, error: AXError) {
  let systemWideElement = AXUIElementCreateSystemWide()
  var focusedAppValue: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(
    systemWideElement,
    kAXFocusedApplicationAttribute as CFString,
    &focusedAppValue,
  )

  if
    result == .success,
    let focusedAppValue,
    CFGetTypeID(focusedAppValue) == AXUIElementGetTypeID()
  {
    return ((focusedAppValue as! AXUIElement), result)
  }

  guard
    let frontmostApplication = NSWorkspace.shared.frontmostApplication,
    frontmostApplication.processIdentifier > 0
  else {
    return (nil, result)
  }

  return (AXUIElementCreateApplication(frontmostApplication.processIdentifier), result)
}

private func copyFocusedUIElement(from focusedApp: AXUIElement) -> ElementLookupResult {
  let appFocused = copyElementAttribute(focusedApp, kAXFocusedUIElementAttribute as CFString)
  if let element = appFocused.element {
    return ElementLookupResult(
      element: element,
      error: .success,
      searchBudgetExhausted: false,
    )
  }

  let systemWideElement = AXUIElementCreateSystemWide()
  let systemWideFocused = copyElementAttribute(
    systemWideElement,
    kAXFocusedUIElementAttribute as CFString,
  )
  if let element = systemWideFocused.element {
    return ElementLookupResult(
      element: element,
      error: .success,
      searchBudgetExhausted: false,
    )
  }

  let focusedWindow = copyElementAttribute(focusedApp, kAXFocusedWindowAttribute as CFString)
  var searchBudget = DescendantSearchBudget()
  if let window = focusedWindow.element {
    let windowFocused = copyElementAttribute(window, kAXFocusedUIElementAttribute as CFString)
    let element =
      windowFocused.element
      ?? copyFocusedEditableDescendant(from: window, budget: &searchBudget).element

    if let element {
      return ElementLookupResult(
        element: element,
        error: .success,
        searchBudgetExhausted: searchBudget.exhausted,
      )
    }
    if windowFocused.error != .noValue && windowFocused.error != .attributeUnsupported {
      return ElementLookupResult(
        element: nil,
        error: windowFocused.error,
        searchBudgetExhausted: searchBudget.exhausted,
      )
    }
  }

  let appSearch = copyFocusedEditableDescendant(from: focusedApp, budget: &searchBudget)
  if let element = appSearch.element {
    return ElementLookupResult(
      element: element,
      error: .success,
      searchBudgetExhausted: searchBudget.exhausted,
    )
  }

  return ElementLookupResult(
    element: nil,
    error: appFocused.error != .noValue ? appFocused.error : systemWideFocused.error,
    searchBudgetExhausted: searchBudget.exhausted,
  )
}

private func enableManualAccessibility(for focusedApp: AXUIElement) -> Bool {
  AXUIElementSetAttributeValue(
    focusedApp,
    "AXManualAccessibility" as CFString,
    kCFBooleanTrue,
  ) == .success
}

private final class AccessibilitySession {
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
  }
}

private func readPayload(from line: String) -> [String: Any]? {
  guard
    let data = line.data(using: .utf8),
    let payload = try? JSONSerialization.jsonObject(with: data),
    let dictionary = payload as? [String: Any]
  else {
    return nil
  }
  return dictionary
}

@discardableResult
private func handlePayload(_ payload: [String: Any], session: AccessibilitySession) -> Bool {
  switch payload["command"] as? String {
  case "capture":
    do {
      emitResponse(successResponse(try session.capture()))
    } catch let failure as HelperFailure {
      emitResponse(failureResponse(from: failure))
    } catch {
      emitResponse(failureResponse())
    }
    return true

  case "writeBack":
    guard let content = payload["content"] as? String else {
      emitResponse(
        failureResponse(
          code: HelperErrorCode.invalidPayload,
          message: "Invalid helper JSON payload.",
        ),
      )
      return true
    }

    do {
      try session.writeBack(content)
      emitResponse(successResponse(["status": "written"]))
    } catch let failure as HelperFailure {
      emitResponse(failureResponse(from: failure))
    } catch {
      emitResponse(failureResponse())
    }
    return true

  case "quit":
    emitResponse(successResponse(["status": "quit"]))
    return false

  default:
    emitResponse(
      failureResponse(
        code: HelperErrorCode.invalidCommand,
        message: "Invalid helper command.",
      ),
    )
    return true
  }
}

private let session = AccessibilitySession()
while let line = readLine(strippingNewline: true) {
  autoreleasepool {
    guard let payload = readPayload(from: line) else {
      emitResponse(
        failureResponse(
          code: HelperErrorCode.invalidPayload,
          message: "Invalid helper JSON payload.",
        ),
      )
      return
    }

    if !handlePayload(payload, session: session) {
      exit(0)
    }
  }
}
