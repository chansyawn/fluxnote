import Foundation

@discardableResult
func handlePayload(_ payload: [String: Any], session: AccessibilitySession) -> Bool {
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

  case "activate":
    guard
      let processId = payload["processId"] as? Int,
      processId >= 0,
      processId <= Int(Int32.max)
    else {
      emitResponse(
        failureResponse(
          code: HelperErrorCode.invalidPayload,
          message: "Invalid helper JSON payload.",
        ),
      )
      return true
    }

    activateApplication(processId: pid_t(processId))
    emitResponse(successResponse(["status": "activation_requested"]))
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
