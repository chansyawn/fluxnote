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

Napi::Value CaptureTextJson(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return ToNapiString(env, [Bridge() captureTextJson]);
}

Napi::Value ReplaceTextJson(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "replaceTextJson expects textRef and text strings.").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string textRef = info[0].As<Napi::String>().Utf8Value();
  std::string text = info[1].As<Napi::String>().Utf8Value();
  NSString* nativeTextRef = [NSString stringWithUTF8String:textRef.c_str()];
  NSString* nativeText = [NSString stringWithUTF8String:text.c_str()];
  return ToNapiString(env, [Bridge() replaceTextJson:nativeTextRef text:nativeText]);
}

Napi::Value ReleaseTextJson(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "releaseTextJson expects a textRef string.").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string textRef = info[0].As<Napi::String>().Utf8Value();
  NSString* nativeTextRef = [NSString stringWithUTF8String:textRef.c_str()];
  return ToNapiString(env, [Bridge() releaseTextJson:nativeTextRef]);
}

Napi::Value ActivateApplicationJson(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "activateApplicationJson expects a process id number.").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  return ToNapiString(env, [Bridge() activateApplicationJson:info[0].As<Napi::Number>().Int32Value()]);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("isAccessibilityTrusted", Napi::Function::New(env, IsAccessibilityTrusted));
  exports.Set("captureTextJson", Napi::Function::New(env, CaptureTextJson));
  exports.Set("replaceTextJson", Napi::Function::New(env, ReplaceTextJson));
  exports.Set("releaseTextJson", Napi::Function::New(env, ReleaseTextJson));
  exports.Set("activateApplicationJson", Napi::Function::New(env, ActivateApplicationJson));
  return exports;
}

}  // namespace

NODE_API_MODULE(mac_native, Init)
