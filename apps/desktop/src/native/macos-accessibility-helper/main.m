#import <ApplicationServices/ApplicationServices.h>
#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>

@interface AccessibilitySession : NSObject
@property(nonatomic) AXUIElementRef focusedElement;
@property(nonatomic) CFRange originalRange;
@property(nonatomic) BOOL hasOriginalRange;
@property(nonatomic) BOOL useSelectionWriteBack;
- (NSDictionary *)capture:(NSError **)error;
- (BOOL)writeBack:(NSString *)content error:(NSError **)error;
@end

static NSString *const HelperErrorDomain = @"app.fluxnotes.MacAccessibilityHelper";

static NSError *HelperError(NSString *message) {
  return [NSError errorWithDomain:HelperErrorDomain code:1 userInfo:@{NSLocalizedDescriptionKey : message}];
}

static void Emit(NSDictionary *response) {
  NSData *data = [NSJSONSerialization dataWithJSONObject:response options:0 error:nil];
  if (!data) {
    return;
  }
  NSString *line = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  fprintf(stdout, "%s\n", line.UTF8String);
  fflush(stdout);
}

static NSDictionary *Success(id data) {
  return @{@"ok" : @YES, @"data" : data ?: [NSNull null]};
}

static NSDictionary *Failure(NSString *message) {
  return @{@"ok" : @NO, @"error" : message ?: @"macOS Accessibility helper failed."};
}

static NSString *ReadStringAttribute(AXUIElementRef element, CFStringRef attribute) {
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

static AXUIElementRef CopyFocusedApplicationElement(AXError *systemWideError) {
  AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
  CFTypeRef focusedAppValue = NULL;
  AXError appResult = AXUIElementCopyAttributeValue(
      systemWideElement, kAXFocusedApplicationAttribute, &focusedAppValue);
  CFRelease(systemWideElement);

  if (systemWideError != NULL) {
    *systemWideError = appResult;
  }
  if (appResult == kAXErrorSuccess && focusedAppValue != NULL) {
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

static NSNumber *NumberOrNull(pid_t value) {
  return [NSNumber numberWithInt:value];
}

@implementation AccessibilitySession

- (void)dealloc {
  if (_focusedElement != NULL) {
    CFRelease(_focusedElement);
  }
}

- (NSDictionary *)capture:(NSError **)error {
  if (!AXIsProcessTrusted()) {
    if (error) {
      *error = HelperError(@"Accessibility permission is not granted.");
    }
    return nil;
  }

  AXError appResult = kAXErrorFailure;
  AXUIElementRef focusedApp = CopyFocusedApplicationElement(&appResult);
  if (focusedApp == NULL) {
    if (error) {
      *error = HelperError(appResult == kAXErrorAPIDisabled
                               ? @"Accessibility permission is not granted."
                               : MessageWithAXError(@"Unable to read the focused application.",
                                                    appResult));
    }
    return nil;
  }

  CFTypeRef focusedElementValue = NULL;
  AXError elementResult = AXUIElementCopyAttributeValue(
      focusedApp, kAXFocusedUIElementAttribute, &focusedElementValue);
  CFRelease(focusedApp);
  if (elementResult != kAXErrorSuccess || focusedElementValue == NULL) {
    if (error) {
      *error = HelperError(elementResult == kAXErrorAPIDisabled
                               ? @"Accessibility permission is not granted."
                               : MessageWithAXError(@"No focused editable element was found.",
                                                    elementResult));
    }
    return nil;
  }

  AXUIElementRef element = (AXUIElementRef)focusedElementValue;
  NSString *role = ReadStringAttribute(element, kAXRoleAttribute);
  if ([role isEqualToString:@"AXSecureTextField"]) {
    CFRelease(element);
    if (error) {
      *error = HelperError(@"Secure text fields are not supported.");
    }
    return nil;
  }

  NSString *value = ReadStringAttribute(element, kAXValueAttribute);
  if (!value) {
    CFRelease(element);
    if (error) {
      *error = HelperError(@"The focused element does not expose editable text.");
    }
    return nil;
  }

  NSString *selectedText = ReadStringAttribute(element, kAXSelectedTextAttribute);
  BOOL hasSelection = selectedText.length > 0;
  CFRange selectedRange = CFRangeMake(0, 0);
  BOOL hasSelectedRange = NO;
  CFTypeRef selectedRangeValue = NULL;
  AXError selectedRangeResult = AXUIElementCopyAttributeValue(
      element, kAXSelectedTextRangeAttribute, &selectedRangeValue);
  if (selectedRangeResult == kAXErrorSuccess && selectedRangeValue != NULL &&
      CFGetTypeID(selectedRangeValue) == AXValueGetTypeID()) {
    hasSelectedRange =
        AXValueGetValue((AXValueRef)selectedRangeValue, kAXValueCFRangeType, &selectedRange);
  }
  if (selectedRangeValue != NULL) {
    CFRelease(selectedRangeValue);
  }

  if (self.focusedElement != NULL) {
    CFRelease(self.focusedElement);
  }
  self.focusedElement = element;
  self.originalRange = selectedRange;
  self.hasOriginalRange = hasSelectedRange;
  self.useSelectionWriteBack = hasSelection;

  pid_t processId = 0;
  AXUIElementGetPid(element, &processId);
  NSRunningApplication *application =
      [NSRunningApplication runningApplicationWithProcessIdentifier:processId];
  NSDictionary *selectedRangePayload = hasSelectedRange
                                           ? @{
                                               @"location" : @(selectedRange.location),
                                               @"length" : @(selectedRange.length),
                                             }
                                           : (id)[NSNull null];

  return @{
    @"appBundleId" : application.bundleIdentifier ?: (id)[NSNull null],
    @"appName" : application.localizedName ?: (id)[NSNull null],
    @"content" : hasSelection ? selectedText : value,
    @"editScope" : hasSelection ? @"selection" : @"full_value",
    @"elementRole" : role ?: (id)[NSNull null],
    @"processId" : NumberOrNull(processId),
    @"selectedRange" : selectedRangePayload,
  };
}

- (BOOL)writeBack:(NSString *)content error:(NSError **)error {
  if (self.focusedElement == NULL) {
    if (error) {
      *error = HelperError(@"No focused editable element was captured.");
    }
    return NO;
  }

  if (self.useSelectionWriteBack && self.hasOriginalRange) {
    CFRange range = self.originalRange;
    AXValueRef rangeValue = AXValueCreate(kAXValueCFRangeType, &range);
    AXError rangeResult =
        AXUIElementSetAttributeValue(self.focusedElement, kAXSelectedTextRangeAttribute, rangeValue);
    if (rangeValue != NULL) {
      CFRelease(rangeValue);
    }
    if (rangeResult == kAXErrorSuccess) {
      AXError selectedTextResult = AXUIElementSetAttributeValue(
          self.focusedElement, kAXSelectedTextAttribute, (__bridge CFTypeRef)content);
      if (selectedTextResult == kAXErrorSuccess) {
        return YES;
      }
      if (error) {
        *error = HelperError([NSString
            stringWithFormat:@"Unable to replace selected text: %d", selectedTextResult]);
      }
      return NO;
    }
    if (error) {
      *error = HelperError(
          [NSString stringWithFormat:@"Unable to restore selected range: %d", rangeResult]);
    }
    return NO;
  }

  AXError valueResult = AXUIElementSetAttributeValue(
      self.focusedElement, kAXValueAttribute, (__bridge CFTypeRef)content);
  if (valueResult == kAXErrorSuccess) {
    return YES;
  }

  if (error) {
    *error = HelperError(
        [NSString stringWithFormat:@"Unable to write edited text back: %d", valueResult]);
  }
  return NO;
}

@end

int main(void) {
  @autoreleasepool {
    AccessibilitySession *session = [[AccessibilitySession alloc] init];
    char *line = NULL;
    size_t capacity = 0;

    while (getline(&line, &capacity, stdin) != -1) {
      @autoreleasepool {
        NSString *text = [[NSString alloc] initWithUTF8String:line];
        NSData *data = [text dataUsingEncoding:NSUTF8StringEncoding];
        NSError *jsonError = nil;
        NSDictionary *payload = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
        if (![payload isKindOfClass:NSDictionary.class]) {
          Emit(Failure(@"Invalid helper JSON payload."));
          continue;
        }

        NSString *command = payload[@"command"];
        NSError *commandError = nil;
        if ([command isEqualToString:@"capture"]) {
          NSDictionary *capture = [session capture:&commandError];
          Emit(capture ? Success(capture) : Failure(commandError.localizedDescription));
        } else if ([command isEqualToString:@"writeBack"]) {
          NSString *content = payload[@"content"];
          if (![content isKindOfClass:NSString.class]) {
            Emit(Failure(@"Invalid helper JSON payload."));
            continue;
          }
          BOOL ok = [session writeBack:content error:&commandError];
          Emit(ok ? Success(@{@"status" : @"written"}) : Failure(commandError.localizedDescription));
        } else if ([command isEqualToString:@"quit"]) {
          Emit(Success(@{@"status" : @"quit"}));
          free(line);
          return 0;
        } else {
          Emit(Failure(@"Invalid helper command."));
        }
      }
    }

    free(line);
  }

  return 0;
}
