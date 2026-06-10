import Foundation

let session = AccessibilitySession()
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
