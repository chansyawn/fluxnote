# FluxNote Development Workflow

## Overview

In development mode, the CLI and deep-link flows communicate with the GUI over IPC instead of relying on the packaged app. This makes it possible to test the full note creation and navigation flow without building a production bundle.

IPC endpoints are isolated per repository instance by default, so multiple worktrees can run `pnpm tauri dev` at the same time without sending messages to the wrong GUI process.

## Usage

### 1. Start the GUI in development mode

```bash
pnpm tauri dev
```

The GUI detects development mode automatically and starts the local IPC server during startup.

### 2. Create a note from the CLI

```bash
pnpm flux "note content"
```

The CLI will:

- create a block
- send a deep-link IPC message to the GUI
- show the window and focus the target block

### 3. Test a deep link directly

```bash
pnpm open fluxnote://block/01JQWXYZ123456789
```

This helper command sends an arbitrary `fluxnote://` URL to the running development GUI without changing application code.

### 4. Optionally override the IPC endpoint

```bash
FLUXNOTE_DEV_SOCKET=/tmp/fluxnote-dev-custom.sock pnpm tauri dev
FLUXNOTE_DEV_SOCKET=/tmp/fluxnote-dev-custom.sock pnpm flux "note content"
```

If `FLUXNOTE_DEV_SOCKET` is not set, FluxNote derives a unique endpoint from the repository root path. If it is set, both the GUI and the CLI must use the same value.

## How It Works

### Development mode detection

Development mode is enabled automatically when either of the following is true:

- the `CARGO` environment variable is present, which is the normal case for `cargo run`
- `FLUXNOTE_DEV_MODE=1` is set explicitly

### IPC transport

- the GUI starts a local socket server bound to the current repository instance
- the CLI connects to the same endpoint and sends JSON messages
- the current message payload carries a deep-link URL
- `FLUXNOTE_DEV_SOCKET` can override the auto-derived endpoint when needed

## Production Behavior

Outside development mode, the CLI and deep-link flows continue to use the system-level URL scheme. Development IPC does not replace the production deep-link path.

## Extending the Workflow

### Add a new CLI-triggered navigation flow

Call `open_deep_link(url)` from CLI code. The IPC layer will route the request in development mode and keep the existing system deep-link behavior in production mode.

### Add a new deep-link route

Extend the parsing and handling logic in `src-tauri/src/features/deep_link.rs`.

### Add new IPC message types

Extend `src-tauri/src/dev/protocol.rs` and reuse the existing client/server infrastructure.
