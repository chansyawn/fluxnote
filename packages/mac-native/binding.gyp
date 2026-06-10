{
  "variables": {
    "swift_module_name": "MacNativeSwift",
    "swift_target": "arm64-apple-macos13.5",
    "swift_header": "<(PRODUCT_DIR)/MacNativeSwift-Swift.h",
    "swift_library": "<(PRODUCT_DIR)/libMacNativeSwift.a",
    "swift_sources": [
      "src/native/mac-native-errors.swift",
      "src/native/ax-attributes.swift",
      "src/native/app-metadata.swift",
      "src/native/editable-element-lookup.swift",
      "src/native/accessibility-session.swift",
      "src/native/mac-native-bridge.swift"
    ]
  },
  "targets": [
    {
      "target_name": "mac_native",
      "sources": [
        "src/native/addon.mm"
      ],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include_dir\")",
        "<(PRODUCT_DIR)"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "actions": [
        {
          "action_name": "build_swift_static_library",
          "inputs": [
            "<@(swift_sources)"
          ],
          "outputs": [
            "<(swift_header)",
            "<(swift_library)"
          ],
          "action": [
            "env",
            "MACOSX_DEPLOYMENT_TARGET=13.5",
            "xcrun",
            "swiftc",
            "-target",
            "<(swift_target)",
            "-emit-library",
            "-static",
            "-module-name",
            "<(swift_module_name)",
            "-emit-objc-header",
            "-emit-objc-header-path",
            "<(swift_header)",
            "-framework",
            "ApplicationServices",
            "-framework",
            "AppKit",
            "-o",
            "<(swift_library)",
            "<@(swift_sources)"
          ]
        }
      ],
      "libraries": [
        "<(swift_library)"
      ],
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++20",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "MACOSX_DEPLOYMENT_TARGET": "13.5",
        "OTHER_LDFLAGS": [
          "-framework",
          "ApplicationServices",
          "-framework",
          "AppKit",
          "-framework",
          "Foundation"
        ]
      },
      "conditions": [
        ["target_arch=='x64'", {
          "variables": {
            "swift_target": "x86_64-apple-macos13.5"
          }
        }],
        ["OS=='mac'", {
          "sources": [
            "src/native/addon.mm"
          ]
        }]
      ]
    }
  ]
}
