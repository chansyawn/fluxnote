# FluxNote Development Workflow

## Overview

FluxNote uses Electron as the single backend runtime. The renderer, CLI, and deep links all route user actions into Electron main process commands instead of writing application data directly.

The CLI talks to the running app through a local IPC socket. If the app is not running, the CLI opens `fluxnote://app/open`, waits for the IPC server, and then sends the requested command.

## Usage

### Start the GUI in development mode

```bash
vp run dev
```

### Open the app from the CLI

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

## How It Works

- Electron main starts a local IPC server after app initialization.
- The CLI parses arguments with `cac` and sends a structured command request to main.
- Main validates the command payload, performs database work, and returns a structured result.
- Deep links are thin adapters:
  - `fluxnote://app/open` maps to the app open command.
  - `fluxnote://block/<block-id>` maps to the block open command.
- Renderer receives an open-block request, refreshes block data, clears workspace filters, and focuses the target block.

Run the CLI build explicitly when needed:

```bash
vp run cli:build
```
