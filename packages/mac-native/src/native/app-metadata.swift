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
    "appIcon": pngDataUrl(application?.icon),
    "appName": nullableString(application?.localizedName),
    "processId": Int(processId),
  ]
}

private func pngDataUrl(_ image: NSImage?, size: CGFloat = 32) -> Any {
  guard let image else {
    return NSNull()
  }

  let targetSize = NSSize(width: size, height: size)
  let resized = NSImage(size: targetSize)
  resized.lockFocus()
  image.draw(
    in: NSRect(origin: .zero, size: targetSize),
    from: NSRect(origin: .zero, size: image.size),
    operation: .copy,
    fraction: 1
  )
  resized.unlockFocus()

  guard
    let tiff = resized.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiff),
    let png = bitmap.representation(using: .png, properties: [:])
  else {
    return NSNull()
  }

  return "data:image/png;base64,\(png.base64EncodedString())"
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
