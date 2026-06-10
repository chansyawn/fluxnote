#include <napi.h>

#import <Foundation/Foundation.h>
#import "MacNativeSwift-Swift.h"

namespace {

MacNativeBridge* Bridge() {
  static MacNativeBridge* bridge = [[MacNativeBridge alloc] init];
  return bridge;
}

Napi::String ToNapiString(Napi::Env env, NSString* value) {
  return Napi::String::New(env, [value UTF8String]);
}

Napi::Value IsAccessibilityTrusted(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  bool prompt = false;
  if (info.Length() > 0) {
    prompt = info[0].ToBoolean().Value();
  }
  return Napi::Boolean::New(env, [Bridge() isAccessibilityTrusted:prompt]);
}

Napi::Value CaptureJson(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return ToNapiString(env, [Bridge() captureJson]);
}

Napi::Value WriteBackJson(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "writeBackJson expects sessionId and content strings.").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string sessionId = info[0].As<Napi::String>().Utf8Value();
  std::string content = info[1].As<Napi::String>().Utf8Value();
  NSString* nativeSessionId = [NSString stringWithUTF8String:sessionId.c_str()];
  NSString* nativeContent = [NSString stringWithUTF8String:content.c_str()];
  return ToNapiString(env, [Bridge() writeBackJson:nativeSessionId content:nativeContent]);
}

Napi::Value CloseSessionJson(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "closeSessionJson expects a sessionId string.").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string sessionId = info[0].As<Napi::String>().Utf8Value();
  NSString* nativeSessionId = [NSString stringWithUTF8String:sessionId.c_str()];
  return ToNapiString(env, [Bridge() closeSessionJson:nativeSessionId]);
}

Napi::Value ActivateJson(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "activateJson expects a process id number.").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return ToNapiString(env, [Bridge() activateJson:info[0].As<Napi::Number>().Int32Value()]);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("isAccessibilityTrusted", Napi::Function::New(env, IsAccessibilityTrusted));
  exports.Set("captureJson", Napi::Function::New(env, CaptureJson));
  exports.Set("writeBackJson", Napi::Function::New(env, WriteBackJson));
  exports.Set("closeSessionJson", Napi::Function::New(env, CloseSessionJson));
  exports.Set("activateJson", Napi::Function::New(env, ActivateJson));
  return exports;
}

}  // namespace

NODE_API_MODULE(mac_native, Init)
