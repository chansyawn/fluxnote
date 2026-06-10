import AppKit
import ApplicationServices
import Foundation

private let maxDescendantDepth = 32
private let maxVisitedDescendants = 4096

private let editableRoles: Set<String> = [
  "AXComboBox",
  "AXSearchField",
  "AXTextArea",
  "AXTextField",
]

struct DescendantSearchBudget {
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

struct ElementLookupResult {
  let element: AXUIElement?
  let error: AXError
  let searchBudgetExhausted: Bool
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

func copyFocusedApplicationElement() -> (element: AXUIElement?, error: AXError) {
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

func copyFocusedUIElement(from focusedApp: AXUIElement) -> ElementLookupResult {
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
    if
      windowFocused.error != .noValue,
      windowFocused.error != .attributeUnsupported,
      windowFocused.error != .cannotComplete
    {
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

// Chromium/Electron exposes its web accessibility tree after assistive clients enable
// enhanced UI on the window. This mirrors the path used by Accessibility Inspector.
@discardableResult
func enableEnhancedUserInterface(for focusedApp: AXUIElement) -> Bool {
  let focusedWindow = copyElementAttribute(focusedApp, kAXFocusedWindowAttribute as CFString)
  if
    let window = focusedWindow.element,
    setAccessibilityFlag(window, "AXEnhancedUserInterface" as CFString)
  {
    return true
  }

  let mainWindow = copyElementAttribute(focusedApp, kAXMainWindowAttribute as CFString)
  if
    let window = mainWindow.element,
    setAccessibilityFlag(window, "AXEnhancedUserInterface" as CFString)
  {
    return true
  }

  return setAccessibilityFlag(focusedApp, "AXEnhancedUserInterface" as CFString)
}

func enableManualAccessibility(for focusedApp: AXUIElement) -> Bool {
  setAccessibilityFlag(focusedApp, "AXManualAccessibility" as CFString)
}
