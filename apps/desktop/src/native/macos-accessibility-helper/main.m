#import <ApplicationServices/ApplicationServices.h>
#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>

static NSString *const HelperErrorDomain = @"app.fluxnotes.MacAccessibilityHelper";
static NSString *const HelperErrorCodeKey = @"code";
static NSUInteger const MaxDescendantDepth = 8;

static NSString *const ErrorInvalidPayload = @"invalid_payload";
static NSString *const ErrorInvalidCommand = @"invalid_command";
static NSString *const ErrorNoCapturedElement = @"no_captured_element";
static NSString *const ErrorNoEditableElement = @"no_editable_element";
static NSString *const ErrorPermissionRequired = @"permission_required";
static NSString *const ErrorSecureTextField = @"secure_text_field";
static NSString *const ErrorUnsupportedElement = @"unsupported_element";
static NSString *const ErrorWriteBackFailed = @"write_back_failed";

@interface AccessibilitySession : NSObject
@property(nonatomic) AXUIElementRef focusedElement;
- (NSDictionary *)capture:(NSError **)error;
- (BOOL)writeBack:(NSString *)content error:(NSError **)error;
@end

typedef struct {
  AXUIElementRef element;
  AXError error;
} ElementLookupResult;

typedef NS_ENUM(NSInteger, EditableSearchMode) {
  EditableSearchModeFocusedOnly,
  EditableSearchModeAnyEditable,
};

static NSError *HelperError(NSString *code, NSString *message) {
  return [NSError errorWithDomain:HelperErrorDomain
                             code:1
                         userInfo:@{
                           HelperErrorCodeKey : code,
                           NSLocalizedDescriptionKey : message,
                         }];
}

static NSString *HelperErrorCode(NSError *error) {
  NSString *code = error.userInfo[HelperErrorCodeKey];
  return [code isKindOfClass:NSString.class] ? code : ErrorWriteBackFailed;
}

static NSDictionary *SuccessResponse(id data) {
  return @{@"ok" : @YES, @"data" : data ?: [NSNull null]};
}

static NSDictionary *FailureResponse(NSString *code, NSString *message) {
  return @{
    @"ok" : @NO,
    @"code" : code ?: ErrorWriteBackFailed,
    @"error" : message ?: @"macOS Accessibility helper failed.",
  };
}

static NSDictionary *FailureResponseFromError(NSError *error) {
  return FailureResponse(HelperErrorCode(error), error.localizedDescription);
}

static void EmitResponse(NSDictionary *response) {
  NSData *data = [NSJSONSerialization dataWithJSONObject:response options:0 error:nil];
  if (data == nil) {
    return;
  }
  NSString *line = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  fprintf(stdout, "%s\n", line.UTF8String);
  fflush(stdout);
}

static NSString *AXErrorDescription(AXError error) {
  switch (error) {
  case kAXErrorSuccess:
    return @"success";
  case kAXErrorFailure:
    return @"failure";
  case kAXErrorIllegalArgument:
    return @"illegal argument";
  case kAXErrorInvalidUIElement:
    return @"invalid UI element";
  case kAXErrorInvalidUIElementObserver:
    return @"invalid UI element observer";
  case kAXErrorCannotComplete:
    return @"cannot complete";
  case kAXErrorAttributeUnsupported:
    return @"attribute unsupported";
  case kAXErrorActionUnsupported:
    return @"action unsupported";
  case kAXErrorNotificationUnsupported:
    return @"notification unsupported";
  case kAXErrorNotImplemented:
    return @"not implemented";
  case kAXErrorNotificationAlreadyRegistered:
    return @"notification already registered";
  case kAXErrorNotificationNotRegistered:
    return @"notification not registered";
  case kAXErrorAPIDisabled:
    return @"Accessibility API disabled";
  case kAXErrorNoValue:
    return @"no value";
  case kAXErrorParameterizedAttributeUnsupported:
    return @"parameterized attribute unsupported";
  case kAXErrorNotEnoughPrecision:
    return @"not enough precision";
  default:
    return [NSString stringWithFormat:@"unknown AXError %d", error];
  }
}

static NSString *MessageWithAXError(NSString *message, AXError error) {
  return [NSString stringWithFormat:@"%@ (%@, code %d)", message, AXErrorDescription(error), error];
}

static NSString *CopyStringAttribute(AXUIElementRef element, CFStringRef attribute) {
  CFTypeRef value = NULL;
  AXError result = AXUIElementCopyAttributeValue(element, attribute, &value);
  if (result != kAXErrorSuccess || value == NULL) {
    return nil;
  }
  if (CFGetTypeID(value) != CFStringGetTypeID()) {
    CFRelease(value);
    return nil;
  }
  return CFBridgingRelease(value);
}

static BOOL CopyBoolAttribute(AXUIElementRef element, CFStringRef attribute) {
  CFTypeRef value = NULL;
  AXError result = AXUIElementCopyAttributeValue(element, attribute, &value);
  if (result != kAXErrorSuccess || value == NULL) {
    return NO;
  }
  BOOL boolValue = CFGetTypeID(value) == CFBooleanGetTypeID() && CFBooleanGetValue(value);
  CFRelease(value);
  return boolValue;
}

static BOOL CanReadAttribute(AXUIElementRef element, CFStringRef attribute) {
  CFTypeRef value = NULL;
  AXError result = AXUIElementCopyAttributeValue(element, attribute, &value);
  if (value != NULL) {
    CFRelease(value);
  }
  return result == kAXErrorSuccess;
}

static AXUIElementRef CopyElementAttribute(AXUIElementRef element, CFStringRef attribute,
                                           AXError *error) {
  CFTypeRef value = NULL;
  AXError result = AXUIElementCopyAttributeValue(element, attribute, &value);
  if (error != NULL) {
    *error = result;
  }
  if (result != kAXErrorSuccess || value == NULL) {
    return NULL;
  }
  if (CFGetTypeID(value) != AXUIElementGetTypeID()) {
    CFRelease(value);
    return NULL;
  }
  return (AXUIElementRef)value;
}

static NSArray *CopyElementArrayAttribute(AXUIElementRef element, CFStringRef attribute) {
  CFTypeRef value = NULL;
  AXError result = AXUIElementCopyAttributeValue(element, attribute, &value);
  if (result != kAXErrorSuccess || value == NULL) {
    return nil;
  }
  if (CFGetTypeID(value) != CFArrayGetTypeID()) {
    CFRelease(value);
    return nil;
  }
  return CFBridgingRelease(value);
}

static BOOL IsEditableRole(NSString *role) {
  static NSSet<NSString *> *editableRoles;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    editableRoles = [NSSet setWithObjects:@"AXComboBox", @"AXSearchField", @"AXTextArea",
                                       @"AXTextField", nil];
  });
  return role != nil && [editableRoles containsObject:role];
}

static BOOL IsEditableCandidate(AXUIElementRef element) {
  NSString *role = CopyStringAttribute(element, kAXRoleAttribute);
  if ([role isEqualToString:@"AXSecureTextField"]) {
    return NO;
  }
  if (IsEditableRole(role)) {
    return YES;
  }
  return CanReadAttribute(element, kAXValueAttribute);
}

static AXUIElementRef CopyEditableDescendant(AXUIElementRef root, NSUInteger depth,
                                             EditableSearchMode mode) {
  if (depth > MaxDescendantDepth) {
    return NULL;
  }

  BOOL isFocusedEnough =
      mode == EditableSearchModeAnyEditable || CopyBoolAttribute(root, kAXFocusedAttribute);
  if (isFocusedEnough && IsEditableCandidate(root)) {
    CFRetain(root);
    return root;
  }

  NSArray *childAttributes =
      @[ (__bridge NSString *)kAXChildrenAttribute, (__bridge NSString *)kAXContentsAttribute ];
  for (NSString *attribute in childAttributes) {
    NSArray *children = CopyElementArrayAttribute(root, (__bridge CFStringRef)attribute);
    for (id child in children) {
      if (CFGetTypeID((__bridge CFTypeRef)child) != AXUIElementGetTypeID()) {
        continue;
      }

      AXUIElementRef match =
          CopyEditableDescendant((__bridge AXUIElementRef)child, depth + 1, mode);
      if (match != NULL) {
        return match;
      }
    }
  }

  return NULL;
}

static AXUIElementRef CopyBestEditableDescendant(AXUIElementRef root) {
  AXUIElementRef element = CopyEditableDescendant(root, 0, EditableSearchModeFocusedOnly);
  if (element != NULL) {
    return element;
  }
  return CopyEditableDescendant(root, 0, EditableSearchModeAnyEditable);
}

static AXUIElementRef CopyFocusedApplicationElement(AXError *systemWideError) {
  AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
  CFTypeRef focusedAppValue = NULL;
  AXError result = AXUIElementCopyAttributeValue(systemWideElement, kAXFocusedApplicationAttribute,
                                                 &focusedAppValue);
  CFRelease(systemWideElement);

  if (systemWideError != NULL) {
    *systemWideError = result;
  }
  if (result == kAXErrorSuccess && focusedAppValue != NULL) {
    return (AXUIElementRef)focusedAppValue;
  }
  if (focusedAppValue != NULL) {
    CFRelease(focusedAppValue);
  }

  NSRunningApplication *frontmostApplication = NSWorkspace.sharedWorkspace.frontmostApplication;
  if (frontmostApplication == nil || frontmostApplication.processIdentifier <= 0) {
    return NULL;
  }

  return AXUIElementCreateApplication(frontmostApplication.processIdentifier);
}

static ElementLookupResult CopyFocusedUIElement(AXUIElementRef focusedApp) {
  AXError appFocusedError = kAXErrorFailure;
  AXUIElementRef element =
      CopyElementAttribute(focusedApp, kAXFocusedUIElementAttribute, &appFocusedError);
  if (element != NULL) {
    return (ElementLookupResult){element, kAXErrorSuccess};
  }

  AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
  AXError systemWideFocusedError = kAXErrorFailure;
  element =
      CopyElementAttribute(systemWideElement, kAXFocusedUIElementAttribute, &systemWideFocusedError);
  CFRelease(systemWideElement);
  if (element != NULL) {
    return (ElementLookupResult){element, kAXErrorSuccess};
  }

  AXError focusedWindowError = kAXErrorFailure;
  AXUIElementRef focusedWindow =
      CopyElementAttribute(focusedApp, kAXFocusedWindowAttribute, &focusedWindowError);
  if (focusedWindow != NULL) {
    AXError windowFocusedError = kAXErrorFailure;
    element = CopyElementAttribute(focusedWindow, kAXFocusedUIElementAttribute, &windowFocusedError);
    if (element == NULL) {
      element = CopyBestEditableDescendant(focusedWindow);
    }
    CFRelease(focusedWindow);

    if (element != NULL) {
      return (ElementLookupResult){element, kAXErrorSuccess};
    }
    if (windowFocusedError != kAXErrorNoValue &&
        windowFocusedError != kAXErrorAttributeUnsupported) {
      return (ElementLookupResult){NULL, windowFocusedError};
    }
  }

  element = CopyBestEditableDescendant(focusedApp);
  if (element != NULL) {
    return (ElementLookupResult){element, kAXErrorSuccess};
  }

  return (ElementLookupResult){
      NULL,
      appFocusedError != kAXErrorNoValue ? appFocusedError : systemWideFocusedError,
  };
}

@implementation AccessibilitySession

- (void)dealloc {
  if (_focusedElement != NULL) {
    CFRelease(_focusedElement);
  }
}

- (NSDictionary *)capture:(NSError **)error {
  if (!AXIsProcessTrusted()) {
    if (error != NULL) {
      *error = HelperError(ErrorPermissionRequired, @"Accessibility permission is not granted.");
    }
    return nil;
  }

  AXError focusedAppError = kAXErrorFailure;
  AXUIElementRef focusedApp = CopyFocusedApplicationElement(&focusedAppError);
  if (focusedApp == NULL) {
    if (error != NULL) {
      *error = focusedAppError == kAXErrorAPIDisabled
                   ? HelperError(ErrorPermissionRequired,
                                 @"Accessibility permission is not granted.")
                   : HelperError(ErrorNoEditableElement,
                                 MessageWithAXError(@"Unable to read the focused application.",
                                                    focusedAppError));
    }
    return nil;
  }

  ElementLookupResult lookup = CopyFocusedUIElement(focusedApp);
  CFRelease(focusedApp);
  if (lookup.element == NULL) {
    if (error != NULL) {
      *error = lookup.error == kAXErrorAPIDisabled
                   ? HelperError(ErrorPermissionRequired,
                                 @"Accessibility permission is not granted.")
                   : HelperError(ErrorNoEditableElement,
                                 MessageWithAXError(@"No focused editable element was found.",
                                                    lookup.error));
    }
    return nil;
  }

  AXUIElementRef element = lookup.element;
  NSString *role = CopyStringAttribute(element, kAXRoleAttribute);
  if ([role isEqualToString:@"AXSecureTextField"]) {
    CFRelease(element);
    if (error != NULL) {
      *error = HelperError(ErrorSecureTextField, @"Secure text fields are not supported.");
    }
    return nil;
  }

  NSString *value = CopyStringAttribute(element, kAXValueAttribute);
  if (value == nil) {
    CFRelease(element);
    if (error != NULL) {
      *error = HelperError(ErrorUnsupportedElement,
                           @"The focused element does not expose editable text.");
    }
    return nil;
  }

  if (self.focusedElement != NULL) {
    CFRelease(self.focusedElement);
  }
  self.focusedElement = element;

  pid_t processId = 0;
  AXUIElementGetPid(element, &processId);
  NSRunningApplication *application =
      [NSRunningApplication runningApplicationWithProcessIdentifier:processId];

  return @{
    @"appBundleId" : application.bundleIdentifier ?: (id)[NSNull null],
    @"appName" : application.localizedName ?: (id)[NSNull null],
    @"content" : value,
    @"elementRole" : role ?: (id)[NSNull null],
    @"processId" : [NSNumber numberWithInt:processId],
  };
}

- (BOOL)writeBack:(NSString *)content error:(NSError **)error {
  if (self.focusedElement == NULL) {
    if (error != NULL) {
      *error = HelperError(ErrorNoCapturedElement, @"No focused editable element was captured.");
    }
    return NO;
  }

  AXError result =
      AXUIElementSetAttributeValue(self.focusedElement, kAXValueAttribute,
                                   (__bridge CFTypeRef)content);
  if (result == kAXErrorSuccess) {
    return YES;
  }

  if (error != NULL) {
    *error = HelperError(
        ErrorWriteBackFailed,
        [NSString stringWithFormat:@"Unable to write edited text back: %@", AXErrorDescription(result)]);
  }
  return NO;
}

@end

static NSDictionary *ReadPayloadFromLine(char *line) {
  NSString *text = [[NSString alloc] initWithUTF8String:line];
  if (text == nil) {
    return nil;
  }

  NSData *data = [text dataUsingEncoding:NSUTF8StringEncoding];
  NSError *jsonError = nil;
  id payload = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
  return [payload isKindOfClass:NSDictionary.class] ? payload : nil;
}

static BOOL HandlePayload(AccessibilitySession *session, NSDictionary *payload) {
  NSString *command = payload[@"command"];
  NSError *commandError = nil;

  if ([command isEqualToString:@"capture"]) {
    NSDictionary *capture = [session capture:&commandError];
    EmitResponse(capture != nil ? SuccessResponse(capture) : FailureResponseFromError(commandError));
    return YES;
  }

  if ([command isEqualToString:@"writeBack"]) {
    NSString *content = payload[@"content"];
    if (![content isKindOfClass:NSString.class]) {
      EmitResponse(FailureResponse(ErrorInvalidPayload, @"Invalid helper JSON payload."));
      return YES;
    }

    BOOL ok = [session writeBack:content error:&commandError];
    EmitResponse(ok ? SuccessResponse(@{@"status" : @"written"})
                    : FailureResponseFromError(commandError));
    return YES;
  }

  if ([command isEqualToString:@"quit"]) {
    EmitResponse(SuccessResponse(@{@"status" : @"quit"}));
    return NO;
  }

  EmitResponse(FailureResponse(ErrorInvalidCommand, @"Invalid helper command."));
  return YES;
}

int main(void) {
  @autoreleasepool {
    AccessibilitySession *session = [[AccessibilitySession alloc] init];
    char *line = NULL;
    size_t capacity = 0;

    while (getline(&line, &capacity, stdin) != -1) {
      @autoreleasepool {
        NSDictionary *payload = ReadPayloadFromLine(line);
        if (payload == nil) {
          EmitResponse(FailureResponse(ErrorInvalidPayload, @"Invalid helper JSON payload."));
          continue;
        }

        if (!HandlePayload(session, payload)) {
          free(line);
          return 0;
        }
      }
    }

    free(line);
  }

  return 0;
}
