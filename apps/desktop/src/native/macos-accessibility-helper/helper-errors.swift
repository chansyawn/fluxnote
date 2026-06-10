import ApplicationServices
import Foundation

enum HelperErrorCode {
  static let invalidPayload = "invalid_payload"
  static let invalidCommand = "invalid_command"
  static let noCapturedElement = "no_captured_element"
  static let noEditableElement = "no_editable_element"
  static let permissionRequired = "permission_required"
  static let secureTextField = "secure_text_field"
  static let unsupportedElement = "unsupported_element"
  static let writeBackFailed = "write_back_failed"
}

struct HelperFailure: Error {
  let code: String
  let message: String
  let data: [String: Any]?
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
