import ApplicationServices
import Foundation

func copyStringAttribute(_ element: AXUIElement, _ attribute: CFString) -> String? {
  var value: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(element, attribute, &value)
  guard result == .success, let value, CFGetTypeID(value) == CFStringGetTypeID() else {
    return nil
  }
  return value as? String
}

func copyBoolAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool {
  var value: CFTypeRef?
  let result = AXUIElementCopyAttributeValue(element, attribute, &value)
  guard result == .success, let value, CFGetTypeID(value) == CFBooleanGetTypeID() else {
    return false
  }
  return (value as? Bool) ?? false
}

func canReadAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool {
  var value: CFTypeRef?
  return AXUIElementCopyAttributeValue(element, attribute, &value) == .success
}

func copyElementAttribute(
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

func copyElementArrayAttribute(
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

func setAccessibilityFlag(_ element: AXUIElement, _ attribute: CFString) -> Bool {
  AXUIElementSetAttributeValue(
    element,
    attribute,
    kCFBooleanTrue,
  ) == .success
}
