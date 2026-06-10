import AppKit
import ApplicationServices
import Foundation

func applicationMetadata(processId: pid_t) -> [String: Any]? {
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

func frontmostApplicationMetadata() -> [String: Any]? {
  guard let application = NSWorkspace.shared.frontmostApplication else {
    return nil
  }
  return applicationMetadata(processId: application.processIdentifier)
}

func applicationMetadata(from element: AXUIElement) -> [String: Any]? {
  var processId: pid_t = 0
  AXUIElementGetPid(element, &processId)
  return applicationMetadata(processId: processId)
}

func elementFailureMetadata(
  applicationMetadata: [String: Any]?,
  role: String?
) -> [String: Any] {
  var metadata = applicationMetadata ?? [:]
  metadata["elementRole"] = nullableString(role)
  return metadata
}

@discardableResult
func activateApplication(processId: pid_t) -> Bool {
  guard processId > 0, let application = NSRunningApplication(processIdentifier: processId) else {
    return false
  }
  return application.activate(options: [.activateAllWindows])
}

@discardableResult
func activateApplication(from element: AXUIElement) -> Bool {
  var processId: pid_t = 0
  AXUIElementGetPid(element, &processId)
  return activateApplication(processId: processId)
}
