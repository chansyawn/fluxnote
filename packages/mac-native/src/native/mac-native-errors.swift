import ApplicationServices
import Foundation

enum MacNativeErrorCode {
  static let addonLoadFailed = "NATIVE.ADDON_LOAD_FAILED"
  static let internalError = "NATIVE.INTERNAL"
  static let invalidPayload = "NATIVE.INVALID_PAYLOAD"
  static let sessionLimitExceeded = "NATIVE.SESSION_LIMIT_EXCEEDED"
  static let sessionNotFound = "NATIVE.SESSION_NOT_FOUND"
  static let unsupportedPlatform = "NATIVE.UNSUPPORTED_PLATFORM"

  static let activateFailed = "ACCESSIBILITY.ACTIVATE_FAILED"
  static let permissionRequired = "ACCESSIBILITY.PERMISSION_REQUIRED"
  static let secureTextField = "ACCESSIBILITY.SECURE_TEXT_FIELD"
  static let writeBackFailed = "ACCESSIBILITY.WRITE_BACK_FAILED"
}

enum MacAccessibilityCopyOnlyReason {
  static let noEditableElement = "NO_EDITABLE_ELEMENT"
  static let searchBudgetExhausted = "SEARCH_BUDGET_EXHAUSTED"
  static let unsupportedElement = "UNSUPPORTED_ELEMENT"
}

struct MacNativeFailure: Error {
  let code: String
  let message: String
  let details: [String: Any]?
}

func axErrorDescription(_ error: AXError) -> String {
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

func messageWithAXError(_ message: String, _ error: AXError) -> String {
  "\(message) (\(axErrorDescription(error)), code \(error.rawValue))"
}
