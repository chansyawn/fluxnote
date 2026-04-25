# FluxNote Development Workflow

## Overview

FluxNote uses Electron as the single backend runtime. The renderer, CLI, and deep links all route user actions into Electron main process commands instead of writing application data directly.

The CLI ships inside the packaged Electron app and uses `ELECTRON_RUN_AS_NODE=1` to run the CLI script with the bundled Node.js runtime (same approach as VS Code's `code` command). In development, the CLI can also be run directly with the system Node.js via `vp run flux`.

## Usage

### Start the GUI in development mode

```bash
vp run dev
```

### Open the app from the CLI (development)

```bash
vp run flux
```

### Create a block from inline text

```bash
vp run flux -- --text "note content"
```

### Create a block from a Markdown file

```bash
vp run flux -- --file ./input.md
vp run flux -- ./input.md
```

### Install the `flux` command system-wide

After packaging, the `flux` command can be installed to `/usr/local/bin/flux` from the app's Preferences page. This creates a symlink to the shell wrapper inside the app bundle.

The installed `flux` command works independently of the development environment — it uses the Electron binary as its Node.js runtime.

## How It Works

- Electron main starts a local IPC server after app initialization.
- The CLI parses arguments with `cac` and sends a structured command request to main over a Unix socket.
- Main validates the command payload, performs database work, and returns a structured result.
- If the app is not running, the CLI launches it (via `open -a` in production, `vp run dev` in development) and waits for the IPC server.
- Deep links are thin adapters:
  - `fluxnote://app/open` maps to the app open command.
  - `fluxnote://block/<block-id>` maps to the block open command.
- Renderer receives an open-block request, refreshes block data, clears workspace filters, and focuses the target block.

## CLI Architecture

```
fluxnote.app/Contents/
  MacOS/fluxnote                    # Electron binary
  Resources/cli/
    flux                            # Shell wrapper (ELECTRON_RUN_AS_NODE=1)
    flux-cli.mjs                    # Fully bundled CLI script

/usr/local/bin/flux → .app/Contents/Resources/cli/flux  (symlink)
```

Run the CLI build explicitly when needed:

```bash
vp run cli:build
```
