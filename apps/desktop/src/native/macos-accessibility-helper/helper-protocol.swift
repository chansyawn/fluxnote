import Foundation

func nullableString(_ value: String?) -> Any {
  value ?? NSNull()
}

func successResponse(_ data: Any?) -> [String: Any] {
  [
    "ok": true,
    "data": data ?? NSNull(),
  ]
}

func failureResponse(
  code: String = HelperErrorCode.writeBackFailed,
  message: String = "macOS Accessibility helper failed.",
  data: [String: Any]? = nil
) -> [String: Any] {
  var response: [String: Any] = [
    "ok": false,
    "code": code,
    "error": message,
  ]
  if let data {
    response["data"] = data
  }
  return response
}

func failureResponse(from failure: HelperFailure) -> [String: Any] {
  failureResponse(code: failure.code, message: failure.message, data: failure.data)
}

func emitResponse(_ response: [String: Any]) {
  guard
    JSONSerialization.isValidJSONObject(response),
    let data = try? JSONSerialization.data(withJSONObject: response)
  else {
    return
  }

  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data([0x0A]))
}

func readPayload(from line: String) -> [String: Any]? {
  guard
    let data = line.data(using: .utf8),
    let payload = try? JSONSerialization.jsonObject(with: data),
    let dictionary = payload as? [String: Any]
  else {
    return nil
  }
  return dictionary
}
